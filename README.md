# Telegram Quiz API — Multi-Tenant Service

A **scalable, multi-tenant API** for delivering Telegram quizzes and polls with image support. Each user brings their own Telegram bot and manages quiz distribution independently through a shared backend.

> **Key Feature**: Queue-based architecture prevents rate limiting and keeps API responses fast.

---

## What This Does

- **Multi-tenant** — Each user has their own Telegram bot, chat, and image folder
- **Image support** — Upload quiz images to Cloudinary; organize by user automatically
- **Non-blocking sends** — Enqueue quiz batches in Redis; send in background
- **Job tracking** — Poll status of queued jobs without waiting
- **Rate limit safe** — Built-in delays between Telegram sends
- **Audit logging** — Track all API requests for security/compliance
- **Encrypted tokens** — Bot tokens encrypted at rest in MongoDB

---

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Redis** ([install locally](https://redis.io/download) or use Docker)
- **MongoDB** ([install locally](https://www.mongodb.com/try/download/community) or use MongoDB Atlas)
- **Cloudinary account** ([free tier available](https://cloudinary.com/))

### 1. Clone & Install

```bash
git clone <your-repo>
cd telegram-quiz-api
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
LOG_FILE=logs/app.log
ERROR_LOG_FILE=logs/error.log

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/telegram_quiz_bot
MONGODB_DB_NAME=telegram_quiz_bot  # Optional, extracted from URI if omitted

# Queue (Redis)
REDIS_URL=redis://127.0.0.1:6379
RUN_QUEUE_WORKER=true

# Cloudinary (Image hosting)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security
BOT_TOKEN_ENCRYPTION_KEY=your_long_random_secret_key_min_32_chars

# Telegram webhook for poll-answer listener (required for wrong-answer tracking)
WEBHOOK_BASE_URL=https://your-public-api-domain.com
REGISTER_WEBHOOK_ON_SIGNIN=true

# Wrong-answer retry worker tuning
RUN_WRONG_ANSWER_RETRY_WORKER=true
WRONG_ANSWER_RETRY_INTERVAL_MS=30000
WRONG_ANSWER_RETRY_BATCH_SIZE=50
WRONG_ANSWER_RETRY_BACKOFF_MINUTES=5

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX=120               # 120 requests per window
AUTH_RATE_LIMIT_WINDOW_MS=900000 # Sign-in rate limit window
AUTH_RATE_LIMIT_MAX=20           # 20 sign-ins per window

# Legacy single-bot mode (optional, for backward compatibility)
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=-1001234567890
IS_CHANNEL=true
SUCCESS_LOG_FILE=logs/send-success.log
FAILED_LOG_FILE=logs/failed-messages.log
```

**Get these values:**
- **Cloudinary**: Sign up at [cloudinary.com](https://cloudinary.com/), grab credentials from Dashboard
- **MongoDB**: Local install or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **Redis**: Install via `brew install redis` (macOS) or Docker
- **BOT_TOKEN_ENCRYPTION_KEY**: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Start the Server

**API mode** (recommended):
```bash
npm run start
```

**Legacy single-bot mode** (for backward compatibility):
```bash
npm run send-all
```

**With Docker Compose** (includes Redis):
```bash
docker compose up --build
```

### 4. Deploy to Heroku

This branch is ready for Heroku with:
- `Procfile` at repo root using `web: npm start`
- `heroku-postbuild` script to compile TypeScript before runtime

Recommended setup:

1. Create app and set buildpack
```bash
heroku create <your-app-name>
heroku buildpacks:set heroku/nodejs
```

2. Provision required add-ons
```bash
heroku addons:create heroku-redis:mini
```

Use MongoDB Atlas and Cloudinary as external services.

3. Configure required env vars
```bash
heroku config:set \
  NODE_ENV=production \
  RUN_QUEUE_WORKER=true \
  BOT_TOKEN_ENCRYPTION_KEY=<your-secret> \
  MONGODB_URI=<your-mongodb-uri> \
  MONGODB_DB_NAME=telegram_quiz_bot \
  REDIS_URL=<heroku-redis-url> \
  CLOUDINARY_CLOUD_NAME=<cloud-name> \
  CLOUDINARY_API_KEY=<api-key> \
  CLOUDINARY_API_SECRET=<api-secret>
```

4. Deploy
```bash
git push heroku <branch-name>:main
heroku logs --tail
```

---

## API Endpoints

### Authentication: Sign In

**Endpoint:** `POST /auth/sign-in`

**Purpose:** Get an API key for subsequent requests. Each user signs in with their own Telegram bot credentials.

**Request Body:**
```json
{
  "chatId": "-1003730571930",
  "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "isChannel": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `chatId` | string or number | Telegram chat/channel ID (negative for channels) |
| `botToken` | string | Telegram Bot API token (get from [@BotFather](https://t.me/botfather)) |
| `isChannel` | boolean | `true` for channels, `false` for direct chats (default: `true`) |

**Response:**
```json
{
  "apiKey": "key_abc123def456...",
  "user": {
    "id": "user_507f1f77bcf86cd799439011",
    "chatId": "-1003730571930",
    "cloudinaryFolder": "1003730571930"
  },
  "expiresIn": null,
  "webhookUrl": "https://your-public-api-domain.com/telegram/webhook/<userId>/<secret>"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "-1003730571930",
    "botToken": "YOUR_BOT_TOKEN",
    "isChannel": true
  }'
```

**Save the `apiKey`** — you'll need it for all subsequent requests (in the `x-api-key` header).

---

### Images: Upload to Cloudinary

**Endpoint:** `POST /images/upload`

**Auth required:** `x-api-key` header

**Purpose:** Upload a quiz image to Cloudinary. Images are automatically organized in a folder based on your chat ID.

**Request:**
```bash
curl -X POST http://localhost:3000/images/upload \
  -H "x-api-key: your_api_key_here" \
  -F "image=@/path/to/quiz_image.jpg"
```

**Response:**
```json
{
  "secureUrl": "https://res.cloudinary.com/your_cloud_name/image/upload/v1699564800/1003730571930/quiz_image.jpg",
  "publicId": "1003730571930/quiz_image"
}
```

**Use `publicId` in quiz objects** when sending quizzes (see next endpoint).

---

### Quizzes: Send Quiz Batch

**Endpoint:** `POST /quizzes/send`

**Auth required:** `x-api-key` header

**Purpose:** Submit a batch of quizzes to be sent to your Telegram chat. Quizzes are enqueued and sent in the background; the API returns immediately with a job ID.

**Request Body:**
```json
{
  "delayMs": 2000,
  "retryWrongAfterMinutes": 60,
  "quizzes": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswerId": 1,
      "explanation": "Paris is the capital of France.",
      "image": "1003730571930/my_quiz_image"
    },
    {
      "question": "True or False?",
      "options": ["True", "False"],
      "correctAnswerId": 0
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `delayMs` | number | Milliseconds to wait between sending each quiz (default: 2000, prevents rate limiting) |
| `retryWrongAfterMinutes` | number | If greater than 0, wrong answers are re-sent to the answering user in a private chat after this delay |
| `quizzes` | array | Array of quiz objects |
| `quizzes[].question` | string | The quiz question (required) |
| `quizzes[].options` | array | 2–8 answer choices (required) |
| `quizzes[].correctAnswerId` | number | Index of correct answer (0-based, required) |
| `quizzes[].explanation` | string | Feedback shown after answering (optional) |
| `quizzes[].image` | string | Image path or URL (optional, see image handling below) |

**Image Handling:**

The `image` field supports three formats:

1. **Cloudinary public ID** (recommended)
   ```json
   "image": "1003730571930/quiz_image"
   ```
   Converted to: `https://res.cloudinary.com/your_cloud_name/image/upload/1003730571930/quiz_image`

2. **Full URL** (external or Cloudinary)
   ```json
   "image": "https://example.com/quiz.jpg"
   ```
   Used as-is.

3. **Local file path** (legacy, file-based mode only)
   ```json
   "image": "./images/quiz.jpg"
   ```
   Resolved relative to file system. **Not supported in API mode.**

**Response:**
```json
{
  "jobId": "job_abc123def456",
  "status": "queued",
  "count": 2
}
```

### Telegram Listener Webhook

**Endpoint:** `POST /telegram/webhook/:userId/:secret`

**Purpose:** Receives Telegram `poll_answer` updates, stores each user's answer, and schedules wrong answers for delayed retry.

This endpoint is configured automatically on sign-in when `WEBHOOK_BASE_URL` is set and `REGISTER_WEBHOOK_ON_SIGNIN` is not `false`.

**cURL Example:**
```bash
curl -X POST http://localhost:3000/quizzes/send \
  -H "x-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "delayMs": 1500,
    "quizzes": [
      {
        "question": "Which planet is closest to the Sun?",
        "options": ["Venus", "Mercury", "Earth", "Mars"],
        "correctAnswerId": 1,
        "explanation": "Mercury is the closest planet to the Sun."
      }
    ]
  }'
```

---

### Jobs: Check Status

**Endpoint:** `GET /jobs/:jobId`

**Auth required:** `x-api-key` header

**Purpose:** Check the status of a queued job (e.g., whether quizzes have finished sending).

**Response:**

Queued:
```json
{
  "id": "job_abc123def456",
  "state": "waiting",
  "progress": null,
  "result": null
}
```

In progress:
```json
{
  "id": "job_abc123def456",
  "state": "active",
  "progress": 1,
  "result": null
}
```

Completed:
```json
{
  "id": "job_abc123def456",
  "state": "completed",
  "progress": 2,
  "result": {
    "sent": 2,
    "failed": 0,
    "errors": []
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/jobs/job_abc123def456 \
  -H "x-api-key: your_api_key_here"
```

---

## Architecture

### Request Flow

```
User API Request
        ↓
  Authentication (x-api-key)
        ↓
  Rate Limiting
        ↓
  Route Handler
        ↓
  Enqueue to Redis
        ↓
  Return Job ID (fast)
        ↓
Background Worker
        ↓
  Process Job
        ↓
  Send to Telegram
        ↓
  Update Job Status
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **API Server** | Handles HTTP requests, auth, rate limiting |
| **Redis Queue** | BullMQ queue for job management |
| **Worker** | Background process that sends quizzes to Telegram |
| **MongoDB** | Stores users, bot tokens (encrypted), audit logs |
| **Cloudinary** | Image hosting and CDN |

---

## Project Structure

```
telegram-quiz-api/
├── index.js                                 # Entrypoint (API + legacy mode)
├── server.js                                # API server setup
├── queue.js                                 # BullMQ queue and worker
├── .env.example                             # Environment template
├── docker-compose.yml                       # Docker setup
├── package.json
│
├── lib/
│   ├── api/
│   │   ├── routes/
│   │   │   └── apiRoutes.js                # API endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js                     # API key authentication
│   │   │   └── rateLimit.js                # Rate limiting
│   │   └── services/
│   │       ├── telegramAuthService.js      # Verify bot token
│   │       └── quizJobService.js           # Queue job management
│   │
│   ├── integrations/
│   │   ├── cloudinaryClient.js             # Cloudinary uploads
│   │   └── telegramClient.js               # Telegram API wrapper
│   │
│   ├── quiz/
│   │   ├── quizDispatchService.js          # Send queued quizzes
│   │   ├── quizSender.js                   # Telegram send logic
│   │   └── quizBot.js                      # Legacy send-all
│   │
│   └── models/
│       └── userStore.js                    # User persistence
│
└── utils/
    ├── quizMedia.js                        # Media normalization
    └── auditStore.js                       # Audit logging
```

---

## Security

### Token Encryption

Bot tokens are encrypted at rest in MongoDB using `BOT_TOKEN_ENCRYPTION_KEY`. Tokens are decrypted only at runtime when sending Telegram requests.

**Generate a secure key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rate Limiting

All API endpoints are rate-limited to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| General APIs | 120 requests | 15 minutes |
| `/auth/sign-in` | 20 requests | 15 minutes |

### Audit Logging

Every API request is logged to MongoDB (`audit_logs` collection) with:
- Request method, path, status code
- User ID and chat ID (if authenticated)
- Client IP and user agent
- API key fingerprint

---

## Docker Deployment

### Local Development

```bash
docker compose up --build
```

This starts:
- **API** on `http://localhost:3000`
- **Redis** on `localhost:6379`
- **MongoDB** on `localhost:27017`

### Production Deployment

Update `docker-compose.yml` with external MongoDB/Redis connections:

```yaml
environment:
  MONGODB_URI: mongodb+srv://user:pass@cluster.mongodb.net/telegram_quiz_bot
  REDIS_URL: redis://redis-host:6379
```

Then:
```bash
docker compose -f docker-compose.yml up -d
```

---

## Testing the API

### 1. Sign In

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "-1003730571930",
    "botToken": "YOUR_BOT_TOKEN",
    "isChannel": true
  }'
```

Copy the `apiKey` from the response.

### 2. Upload an Image

```bash
curl -X POST http://localhost:3000/images/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@/path/to/image.jpg"
```

Copy the `publicId` from the response.

### 3. Send a Quiz

```bash
curl -X POST http://localhost:3000/quizzes/send \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "delayMs": 2000,
    "quizzes": [
      {
        "question": "Test question?",
        "options": ["A", "B"],
        "correctAnswerId": 0,
        "image": "YOUR_PUBLIC_ID"
      }
    ]
  }'
```

Copy the `jobId` from the response.

### 4. Check Job Status

```bash
curl http://localhost:3000/jobs/YOUR_JOB_ID \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Troubleshooting

### "MONGODB_URI is required"
Make sure `MONGODB_URI` is set in `.env` and MongoDB is running.

```bash
# Check if MongoDB is running (local)
mongosh
```

### "Redis connection failed"
Ensure Redis is running and `REDIS_URL` is correct.

```bash
# Check if Redis is running (local)
redis-cli ping
# Should return: PONG
```

### "Telegram API error: Unauthorized"
- Verify `botToken` is correct (get from [@BotFather](https://t.me/botfather))
- Ensure the bot is in the chat/channel
- Token may have been revoked; regenerate with `/newtoken` in BotFather

### "Failed to write audit log"
Check MongoDB connection and that the `audit_logs` collection can be written to.

### Images not uploading
- Verify Cloudinary credentials in `.env`
- Ensure `CLOUDINARY_CLOUD_NAME` matches your account
- Check file is a valid image format (jpg, png, webp, gif)



## Legacy Mode (Single Bot)

For backward compatibility, the service supports "send-all" mode where a single bot token is configured via environment variables. This mode reads quizzes from files and sends them all at once.

**Run legacy mode:**
```bash
npm run send-all
```

**This mode requires:**
- `BOT_TOKEN`, `CHAT_ID`, `IS_CHANNEL`
- `SUCCESS_LOG_FILE`, `FAILED_LOG_FILE`

**Note:** Legacy mode is single-threaded and not recommended for production. Use API mode for new deployments.
