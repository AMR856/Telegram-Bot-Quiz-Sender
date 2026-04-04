# Telegram Quiz API (Multi-Tenant)

This project is now an API service where each user can:

- Sign in with their own Telegram bot token and chat ID.
- Upload quiz images to Cloudinary.
- Submit quiz objects to a background queue.
- Track queued job status without blocking API requests.

Each user can have a different bot token and chat ID. Images are organized in a Cloudinary folder derived from chat ID by removing all dashes.

Example:

- chat ID: -1003730571930
- Cloudinary folder: 1003730571930

## Why Queue Was Added

Sending many quizzes can take time and can hit Telegram rate limits. The API now enqueues send operations in Redis/BullMQ so the HTTP request returns quickly while a worker sends quizzes in the background.

## Requirements

- Node.js 18+
- Redis (for queue)
- Cloudinary account

## Environment Variables

Create .env with:

PORT=3000
REDIS_URL=redis://127.0.0.1:6379
RUN_QUEUE_WORKER=true

MONGODB_URI=mongodb://127.0.0.1:27017/telegram_quiz_bot
# Optional override if URI path has no DB name
MONGODB_DB_NAME=telegram_quiz_bot
# Required to encrypt bot tokens at rest in DB
BOT_TOKEN_ENCRYPTION_KEY=replace_with_a_long_random_secret

# API rate limit tuning
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=120
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

Legacy single-bot envs are still supported for send-all mode:

BOT_TOKEN=telegram_bot_token
CHAT_ID=-1001234567890
IS_CHANNEL=true
SUCCESS_LOG_FILE=logs/send-success.log
FAILED_LOG_FILE=logs/failed-messages.log

## Run Locally

1. Install dependencies:

npm install

2. Start API:

npm run start

3. Optional legacy mode (single bot env):

npm run send-all

## API Endpoints

1. POST /auth/sign-in

Body:

{
  "chatId": "-1003730571930",
  "botToken": "123456:ABC",
  "isChannel": true
}

Response includes:

- apiKey (use this in x-api-key header)
- user metadata
- cloudinaryFolder

2. POST /images/upload

- Auth required: x-api-key
- multipart/form-data
- field name: image

Response includes secureUrl and publicId.

3. POST /quizzes/send

- Auth required: x-api-key
- Body:

{
  "delayMs": 2000,
  "quizzes": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswerId": 1,
      "image": "images/1/my_public_id",
      "explanation": "..."
    }
  ]
}

Notes on image/photo field:

- Full URL: used directly.
- Cloudinary public ID/path: converted to Cloudinary URL using your cloud name and user folder.
- In file-based legacy mode, local relative image paths are still supported.

4. GET /jobs/:id

- Auth required: x-api-key
- Returns queue job state and result.

## Docker and Multi-User

Different bot tokens/chat IDs do not require Docker by themselves.

Docker is recommended when you want:

- Easy deployment
- Redis + API in one stack
- Horizontal scaling (multiple API/worker instances)

Run with Docker Compose:

docker compose up --build

This starts:

- API on port 3000
- Redis on port 6379

## Project Structure

- index.js: entrypoint (API mode + legacy mode)
- server.js: API server composition
- lib/api/routes/apiRoutes.js: API route handlers
- lib/api/middleware/auth.js: API key auth
- lib/api/services/telegramAuthService.js: Telegram token verification
- lib/api/services/quizJobService.js: queue job orchestration and status loading
- queue.js: BullMQ queue/worker setup
- lib/integrations/cloudinaryClient.js: Cloudinary upload helper
- lib/integrations/telegramClient.js: Telegram API wrapper
- lib/quiz/quizDispatchService.js: send queued quizzes for a user
- lib/quiz/quizSender.js: Telegram quiz send logic
- lib/quiz/quizBot.js: legacy send-all orchestration
- utils/userStore.js: persistent user store
- utils/quizMedia.js: media normalization for Cloudinary/local URLs

## Security Note

Users are stored in MongoDB. Bot tokens are encrypted before being persisted and decrypted only at runtime when dispatching Telegram requests.

API requests are also rate-limited and written to an audit log collection (`audit_logs`) with request metadata (method, path, status, user id/chat id if available, and API-key fingerprint).
