# Telegram Quiz Bot

A Node.js bot that sends quiz polls to Telegram channels, groups, or chats.

It includes safeguards for Telegram length limits:
- Long explanations are sent in a separate spoiler message.
- Long poll options are shown in a text message, while the poll uses short labels.
- 429 rate-limit responses are retried automatically.

## Features

- Sends all quizzes from a JSON file.
- Supports poll type `quiz` with `correct_option_id`.
- Uses spoiler formatting for explanations.
- Logs success and failures to files.
- Class-based modular architecture.

## Requirements

- Node.js 18+
- Telegram bot token
- Target chat/channel ID

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create/update `.env` with values similar to:

```env
BOT_TOKEN=123456789:your_bot_token
CHAT_ID=-1001234567890
IS_CHANNEL=true
SUCCESS_LOG_FILE=send-success.log
FAILED_LOG_FILE=failed-messages.log
# Optional: override API base URL
# TELEGRAM_API_URL=https://api.telegram.org/bot<token>
```

## Run

```bash
npm run start
```

This runs:

```bash
node index.js send-all
```

## Quiz File Format

Quizzes are read from `data/quizzes.json`.

Example:

```json
[
  {
    "question": "What are the two main types of packet switches in the Internet?",
    "options": [
      "Hubs and repeaters",
      "Routers and link-layer switches",
      "Modems and amplifiers",
      "Bridges and gateways"
    ],
    "correctAnswerId": 1,
    "explanation": "Routers are used in the network core and link-layer switches in access networks."
  }
]
```

Notes:
- `correctAnswerId` is zero-based (0 = first option, 1 = second option).
- Keep the file as a JSON array of quiz objects.

## Project Structure

- `index.js`: application entrypoint and environment bootstrapping.
- `lib/telegramClient.js`: low-level Telegram API wrapper.
- `lib/quizSender.js`: quiz delivery logic and Telegram limit handling.
- `lib/quizBot.js`: orchestration, loading quizzes, and logging callbacks.
- `utils/parseQuizzes.js`: reads and validates quiz JSON.
- `utils/appendLog.js`: appends timestamped logs.
- `utils/escapeMarkdown.js`: escapes MarkdownV2 explanation text.
- `utils/escapeHtml.js`: escapes HTML for message content.

## Logs

- Success logs: file defined by `SUCCESS_LOG_FILE`
- Failure logs: file defined by `FAILED_LOG_FILE`

## Current Command Support

The current refactored flow supports `send-all`.
Other package scripts may exist in `package.json`, but they are not wired in this architecture yet.

## Troubleshooting

- `Missing Telegram API configuration`: set `BOT_TOKEN` or `TELEGRAM_API_URL`.
- `CHAT_ID is required`: set `CHAT_ID` in `.env`.
- `Bad Request: poll options length must not exceed 100`: handled automatically by split-message fallback.
- `Bad Request: message is too long`: handled automatically by split-message fallback.
