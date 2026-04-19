# Telegram Quiz Bot — Production-Ready API & Legacy Sender

A **TypeScript backend** for delivering interactive Telegram quizzes with **two operational modes**: multi-tenant API (async job-based) or single-bot legacy mode (synchronous batch sender). Uses Express, MongoDB, Redis, BullMQ, and Cloudinary.

> **Two Flavors**: API mode (`npm start`) for scalable multi-user deployments, or legacy mode (`npm run send-all`) for single-bot backward compatibility.

---

## Architecture Overview

### API Mode (Default: `npm start`)

- **Multi-user capable**: Each user signs in with their own Telegram bot token
- **Async job queue**: Quizzes enqueued in Redis, processed by background worker
- **Real-time status**: Poll job progress without blocking
- **Webhook support**: Receive Telegram poll answers for analytics and retry logic
- **Image hosting**: Upload/manage quiz images on Cloudinary per user

### Legacy Mode (`npm run send-all`)

- **Single bot only**: Pre-configured via `BOT_TOKEN` and `CHAT_ID` environment variables
- **Synchronous**: Reads quiz JSON file, sends all quizzes in sequence
- **Simple**: No authentication, no job tracking, no API
- **Backward compatible**: Migrated from shell scripts; kept for existing workflows

---

## Key Features

✅ **Multi-tenant API** (API mode)  
✅ **Image management** — Upload to Cloudinary, organize by user  
✅ **Non-blocking delivery** — Queue-based with background worker  
✅ **Real-time job tracking** — REST API status polling  
✅ **Rate limiting** — Global + auth endpoint protections  
✅ **Audit logging** — Complete request trail to MongoDB  
✅ **Token encryption** — Bot tokens encrypted at rest  
✅ **Wrong-answer retry** — Auto-resend to incorrect answerers  
✅ **Health monitoring** — REST endpoint + SSE stream  
✅ **Webhook ingestion** — Receive poll answers from Telegram  
✅ **Legacy support** — Synchronous mode for single-bot use  

---

## Quick Start

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **Redis** (local, Docker, or cloud URL)
- **MongoDB** (local, Docker, or MongoDB Atlas)
- **Cloudinary** account (free tier available)

### 1. Clone & Install

```bash
git clone https://github.com/AMR856/Telegram-Bot-Quiz-Sender.git
cd Telegram-Bot-Quiz-Sender/backend
npm install
```

### 2. Set Up Environment

Create `.env` in `backend/` directory:

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
LOG_FILE=logs/app.log
ERROR_LOG_FILE=logs/error.log

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/telegram_quiz_bot

# Queue (Redis)
REDIS_URL=redis://127.0.0.1:6379
RUN_QUEUE_WORKER=true

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BOT_TOKEN_ENCRYPTION_KEY=your_32char_secret_key_here

# Telegram Webhooks
WEBHOOK_BASE_URL=https://your-public-domain.com
REGISTER_WEBHOOK_ON_SIGNIN=true

# Wrong-answer retry worker
RUN_WRONG_ANSWER_RETRY_WORKER=true
WRONG_ANSWER_RETRY_INTERVAL_MS=30000
WRONG_ANSWER_RETRY_BATCH_SIZE=50
WRONG_ANSWER_RETRY_BACKOFF_MINUTES=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20

# ===== LEGACY MODE ONLY (npm run send-all) =====
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=-1001234567890
IS_CHANNEL=true
SUCCESS_LOG_FILE=logs/send-success.log
FAILED_LOG_FILE=logs/failed-messages.log
```

**How to get these values:**
- **Cloudinary**: Sign up at [cloudinary.com](https://cloudinary.com/), find credentials in Dashboard
- **MongoDB**: Install locally or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier
- **Redis**: `brew install redis` (macOS), or use a cloud Redis service
- **BOT_TOKEN_ENCRYPTION_KEY**: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **BOT_TOKEN**: Get from [@BotFather](https://t.me/botfather) with `/newtoken`

### 3. Run API Mode

**Development (auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

API listens on `http://localhost:3000`

### 4. Run Legacy Mode

```bash
npm run send-all
```

This reads quizzes from `data/quizzes.json` and sends them synchronously.

---

## API Endpoints (API Mode Only)

### Authentication: Sign In

**`POST /auth/sign-in`**

Each user signs in with their own Telegram bot credentials to get an API key.

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "-1003730571930",
    "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
    "isChannel": true
  }'
```

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
  "webhookUrl": "https://your-api.com/telegram/webhook/<userId>/<secret>"
}
```

**Save the `apiKey`** for all subsequent requests in the `x-api-key` header.

---

### Images: Upload

**`POST /images/upload`**

Upload a single image to Cloudinary.

```bash
curl -X POST http://localhost:3000/images/upload \
  -H "x-api-key: your_api_key" \
  -F "image=@quiz_image.jpg"
```

**Response:**
```json
{
  "secureUrl": "https://res.cloudinary.com/cloud_name/image/upload/v1699564800/1003730571930/quiz_image.jpg",
  "publicId": "1003730571930/quiz_image"
}
```

Save the `publicId` to use in quiz objects.

---

### Images: Bulk Upload

**`POST /images/upload-many`**

Upload multiple images at once (max 20).

```bash
curl -X POST http://localhost:3000/images/upload-many \
  -H "x-api-key: your_api_key" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

---

### Images: List

**`GET /images`**

List all your uploaded images.

```bash
curl http://localhost:3000/images \
  -H "x-api-key: your_api_key"
```

---

### Images: Delete

**`DELETE /images/:publicId(*)`**

Delete an image (supports nested paths like `folder/subfolder/image`).

```bash
curl -X DELETE http://localhost:3000/images/1003730571930/quiz_image \
  -H "x-api-key: your_api_key"
```

---

### Quizzes: Send Batch

**`POST /quizzes/send`**

Submit quizzes for delivery. They're enqueued immediately; API returns a job ID without waiting.

```bash
curl -X POST http://localhost:3000/quizzes/send \
  -H "x-api-key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "delayMs": 2000,
    "retryWrongAfterMinutes": 60,
    "quizzes": [
      {
        "question": "What is the capital of France?",
        "options": ["London", "Paris", "Berlin", "Madrid"],
        "correctAnswerId": 1,
        "explanation": "Paris is the capital of France.",
        "image": "1003730571930/my_quiz_image"
      }
    ]
  }'
```

**Request Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `delayMs` | number | Wait between sends in ms (default: 2000, recommended to avoid rate limits) |
| `retryWrongAfterMinutes` | number | If > 0, retry wrong answers to user after N minutes |
| `quizzes` | array | Quiz objects |
| `quizzes[].question` | string | The quiz question |
| `quizzes[].options` | array | 2–8 answer choices |
| `quizzes[].correctAnswerId` | number | 0-based index of correct answer |
| `quizzes[].explanation` | string | Feedback shown after answering (optional) |
| `quizzes[].image` | string | Image path — supports three formats |

**Image Formats:**

1. **Cloudinary public ID** (recommended)
   ```json
   "image": "1003730571930/quiz_image"
   ```

2. **Full external URL**
   ```json
   "image": "https://example.com/quiz.jpg"
   ```

3. **Local file path** (legacy, API mode doesn't support this)
   ```json
   "image": "./images/quiz.jpg"
   ```

**Response:**
```json
{
  "jobId": "job_abc123def456xyz",
  "status": "queued",
  "count": 5,
  "message": "5 quizzes queued successfully"
}
```

---

### Jobs: Check Status

**`GET /jobs/:jobId`**

Poll the job status without blocking. Job states: `waiting`, `active`, `completed`, `failed`.

```bash
curl http://localhost:3000/jobs/job_abc123def456 \
  -H "x-api-key: your_api_key"
```

**Response Examples:**

**Queued:**
```json
{
  "id": "job_abc123def456",
  "state": "waiting",
  "progress": null,
  "result": null
}
```

**In Progress:**
```json
{
  "id": "job_abc123def456",
  "state": "active",
  "progress": 2,
  "result": null
}
```

**Completed:**
```json
{
  "id": "job_abc123def456",
  "state": "completed",
  "progress": 5,
  "result": {
    "sent": 5,
    "failed": 0,
    "errors": []
  }
}
```

---

### Health: Status

**`GET /health`**

Check API and dependency health (no auth required).

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-04-19T10:30:00Z",
  "uptime": 3600,
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "queue": "ready"
  },
  "version": "1.0.0"
}
```

---

### Health: Real-Time Stream (SSE)

**`GET /health/stream`**

Subscribe to health metrics every 30 seconds via Server-Sent Events.

```bash
curl http://localhost:3000/health/stream
```

**JavaScript client:**
```javascript
const eventSource = new EventSource('http://localhost:3000/health/stream');
eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
eventSource.onerror = () => eventSource.close();
```

---

### Telegram Webhook

**`POST /telegram/webhook/:userId/:secret`**

Receives poll answer updates from Telegram automatically (you don't call this).

**What happens:**
1. User answers a quiz poll in Telegram
2. Telegram sends `poll_answer` update to this webhook
3. We track the answer and correctness
4. If `retryWrongAfterMinutes > 0`, we schedule a retry for incorrect answers

Webhook URL is auto-generated on sign-in when `WEBHOOK_BASE_URL` is configured.

---

## Project Structure

```
backend/
├── index.ts                               # Entry point (picks API vs legacy mode)
├── server.ts                              # Express app setup
├── package.json
├── tsconfig.json
│
├── src/
│   ├── config/
│   │   ├── mongo.ts                       # MongoDB connection
│   │   ├── queue.ts                       # BullMQ setup
│   │   ├── rateLimit.ts                   # Rate limiters
│   │   └── upload.ts                      # Multer config
│   │
│   ├── intergrations/                     # Note: typo in folder name (intergrations)
│   │   ├── cloudinary/
│   │   │   └── cloudinaryClient.ts
│   │   └── telegram/
│   │       ├── telegramAuth.ts
│   │       └── telegramClient.ts
│   │
│   ├── middlewares/
│   │   ├── auth.ts                        # x-api-key validation
│   │   ├── auditLog.ts                    # Request logging
│   │   └── validate.ts                    # Zod validation
│   │
│   ├── modules/
│   │   ├── auth/                          # Sign-in endpoints
│   │   ├── quizzes/                       # Quiz send logic + background worker
│   │   ├── images/                        # Image upload/delete
│   │   ├── jobs/                          # Job status polling
│   │   ├── telegram/                      # Webhook receiver
│   │   └── health/                        # Health checks + SSE
│   │
│   ├── services/                          # Core business logic
│   │   ├── quizBot.ts                     # Legacy mode quiz sender
│   │   ├── quizDispatcher.ts              # Quiz routing
│   │   ├── quizSender.ts                  # Telegram API calls
│   │   ├── quizMediaNormalizer.ts         # Image URL normalization
│   │   ├── quizAnswerTracker.ts           # Poll answer tracking
│   │   └── wrongAnswerRetryWorker.ts      # Retry worker logic
│   │
│   ├── types/
│   │   └── httpStatusText.ts              # HTTP status codes
│   │
│   └── utils/
│       ├── chatMediaResolver.ts           # Media URL resolution
│       ├── customError.ts                 # Custom error class
│       ├── errorHandler.ts                # Error middleware
│       ├── escaper.ts                     # Telegram HTML escape
│       ├── logger.ts                      # Winston logging
│       ├── parser.ts                      # Parsing utilities
│       └── tokenCipher.ts                 # AES-256-GCM encryption
│
└── dist/                                  # Compiled JS (generated)
```

---

## How It Works

### API Mode Request Flow

```
User API Request (x-api-key header)
           ↓
   Rate Limiting Check
           ↓
   Authentication (validate API key)
           ↓
   Audit Log Entry
           ↓
   Route Handler (e.g., POST /quizzes/send)
           ↓
   Enqueue to Redis (BullMQ)
           ↓
   Return Job ID (HTTP 200 immediately)
           ↓
[Background Worker — Async]
           ↓
   Pull job from queue
           ↓
   Send each quiz to Telegram (respecting delayMs)
           ↓
   Store results in MongoDB
           ↓
   Job marked complete
```

### Legacy Mode Flow

```
npm run send-all
           ↓
   Load data/quizzes.json
           ↓
   Create QuizBot instance with BOT_TOKEN, CHAT_ID
           ↓
   Iterate each quiz
           ↓
   Send to Telegram (blocking, one at a time)
           ↓
   Write success/failure logs
           ↓
   Exit
```

---

## Running & Development

### Start API Mode

**Development (auto-reload with tsx):**
```bash
npm run dev
```

**Production (compiled):**
```bash
npm run build
npm start
```

**With worker enabled (required for quiz sending):**
```bash
# Worker runs in the same process as the API by default
# If you set RUN_QUEUE_WORKER=false, jobs won't process
export RUN_QUEUE_WORKER=true
npm start
```

### Start Legacy Mode

```bash
npm run send-all
```

Requires:
- `BOT_TOKEN` in `.env`
- `CHAT_ID` in `.env`
- `data/quizzes.json` file with quiz objects

---

## Testing the API (Full Flow)

```bash
# 1. Sign in
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "-1003730571930",
    "botToken": "YOUR_BOT_TOKEN",
    "isChannel": true
  }' | jq .

export API_KEY="key_from_response"

# 2. Check health
curl http://localhost:3000/health | jq .

# 3. Upload an image
curl -X POST http://localhost:3000/images/upload \
  -H "x-api-key: $API_KEY" \
  -F "image=@quiz.jpg" | jq .

export IMAGE_ID="publicId_from_response"

# 4. Send a quiz
curl -X POST http://localhost:3000/quizzes/send \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "delayMs": 2000,
    "quizzes": [
      {
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5"],
        "correctAnswerId": 1,
        "image": "'$IMAGE_ID'"
      }
    ]
  }' | jq .

export JOB_ID="jobId_from_response"

# 5. Poll job status (run multiple times)
curl http://localhost:3000/jobs/$JOB_ID \
  -H "x-api-key: $API_KEY" | jq .
```

---

## Security

### Token Encryption

Bot tokens stored in MongoDB are encrypted using `BOT_TOKEN_ENCRYPTION_KEY`. Decrypted only at runtime when sending to Telegram.

**Generate a secure key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rate Limiting

- **General APIs**: 120 requests per 15 minutes
- **Sign-in**: 20 requests per 15 minutes

### Audit Logging

Every API request logged to MongoDB's `audit_logs` collection with:
- User ID, chat ID
- Request method, path, status code
- Response time
- Client IP, user agent
- API key fingerprint (not full key)

---

## Troubleshooting

### "MongoDB connection failed"
```bash
# Check MongoDB is running
mongosh "mongodb://127.0.0.1:27017"

# Verify MONGODB_URI in .env
echo $MONGODB_URI
```

### "Redis connection error"
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Verify REDIS_URL
redis-cli -u $REDIS_URL ping
```

### "Telegram API error: Unauthorized"
- Verify bot token format: `123456:ABC-DEF...`
- Get new token from [@BotFather](https://t.me/botfather)
- Ensure bot is in the chat/channel
- Test token validity:
  ```bash
  curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe | jq .
  ```

### "Quiz job stuck in 'active'"
- Ensure `RUN_QUEUE_WORKER=true`
- Check worker logs: `tail -f logs/app.log | grep worker`
- Worker needs to be running in the same process or separate

### "Images not uploading"
- Verify Cloudinary credentials are correct
- Check image file is valid (jpg, png, webp, gif)
- Max file size: 50MB
- Ensure API key has upload permissions

### "Webhook not receiving updates"
- `WEBHOOK_BASE_URL` must be public HTTPS (Telegram can't reach localhost)
- For local testing, use `ngrok http 3000`
- Verify `REGISTER_WEBHOOK_ON_SIGNIN=true` or manually register
- Check webhook URL is accessible: `curl https://your-api-domain.com/telegram/webhook/...`

---

## Database Schemas

### Users (API mode)
```javascript
{
  "_id": ObjectId,
  "chatId": "-1003730571930",
  "isChannel": true,
  "botToken": "encrypted_hash",
  "cloudinaryFolder": "1003730571930",
  "webhookSecret": "hash",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### Audit Logs
```javascript
{
  "_id": ObjectId,
  "userId": ObjectId,
  "chatId": "-1003730571930",
  "method": "POST",
  "path": "/quizzes/send",
  "statusCode": 200,
  "ipAddress": "192.168.1.1",
  "responseTime": 45,
  "timestamp": ISODate
}
```

### Quiz Answers
```javascript
{
  "_id": ObjectId,
  "userId": ObjectId,
  "telegramUserId": 123456,
  "pollId": "poll_abc",
  "optionIds": [1],
  "isCorrect": false,
  "retryScheduled": true,
  "retryAt": ISODate,
  "answeredAt": ISODate
}
```

---

## Deployment

### Heroku

1. **Create app and set buildpack:**
   ```bash
   heroku create my-quiz-bot
   heroku buildpacks:set heroku/nodejs
   ```

2. **Provision Redis:**
   ```bash
   heroku addons:create heroku-redis:mini
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set \
     NODE_ENV=production \
     MONGODB_URI=<your-mongodb-atlas-url> \
     BOT_TOKEN_ENCRYPTION_KEY=<your-secret> \
     CLOUDINARY_CLOUD_NAME=<name> \
     CLOUDINARY_API_KEY=<key> \
     CLOUDINARY_API_SECRET=<secret>
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   heroku logs --tail
   ```

### Local/VPS

1. Install Node.js 20+, Redis, MongoDB
2. Clone repo, run `npm install`
3. Create `.env` file
4. `npm run build && npm start`
5. Use PM2 or systemd to keep it running

---

## Environment Variables Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | No | `3000` | API server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `REDIS_URL` | Yes | — | Redis connection string |
| `RUN_QUEUE_WORKER` | No | `false` | Enable background job processing |
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Yes | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary API secret |
| `BOT_TOKEN_ENCRYPTION_KEY` | Yes | — | 32+ char encryption key |
| `WEBHOOK_BASE_URL` | No | — | Public URL for Telegram webhooks |
| `REGISTER_WEBHOOK_ON_SIGNIN` | No | `true` | Auto-register on sign-in |
| `RUN_WRONG_ANSWER_RETRY_WORKER` | No | `true` | Enable retry worker |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | 15 minutes |
| `RATE_LIMIT_MAX` | No | `120` | Requests per window |
| `BOT_TOKEN` | Legacy only | — | For `npm run send-all` |
| `CHAT_ID` | Legacy only | — | For `npm run send-all` |
| `IS_CHANNEL` | Legacy only | `false` | For `npm run send-all` |

## Quick Reference

| Task | Command |
|------|---------|
| Start API (dev) | `npm run dev` |
| Start API (prod) | `npm run build && npm start` |
| Legacy mode | `npm run send-all` |
| Build | `npm run build` |
| Sign in | `POST /auth/sign-in` |
| Send quizzes | `POST /quizzes/send` |
| Check job | `GET /jobs/:id` |
| Health | `GET /health` |
| Health stream | `GET /health/stream` |
| View logs | `tail -f logs/app.log` |