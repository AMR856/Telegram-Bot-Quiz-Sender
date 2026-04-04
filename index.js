require("dotenv").config();

const { QuizBot } = require("./lib/quiz/quizBot");
const { buildApiServer } = require("./server");

const {
  IS_CHANNEL: IS_CHANNEL_ENV,
  CHAT_ID,
  TELEGRAM_API_URL,
  BOT_TOKEN,
  CLOUDINARY_CLOUD_NAME,
  SUCCESS_LOG_FILE,
  FAILED_LOG_FILE,
  PORT,
} = process.env;

const IS_CHANNEL = String(IS_CHANNEL_ENV).toLowerCase() === "true";
const TELEGRAM_API_BASE_URL =
  TELEGRAM_API_URL ||
  (BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "");

async function runLegacySendAll() {
  if (!TELEGRAM_API_BASE_URL) {
    throw new Error(
      "Missing Telegram API configuration. Set BOT_TOKEN or TELEGRAM_API_URL in .env",
    );
  }

  const bot = new QuizBot({
    chatId: CHAT_ID,
    baseUrl: TELEGRAM_API_BASE_URL,
    isChannel: IS_CHANNEL,
    cloudinaryCloudName: CLOUDINARY_CLOUD_NAME,
    successLogFile: SUCCESS_LOG_FILE,
    failedLogFile: FAILED_LOG_FILE,
  });

  const quizzes = await bot.loadQuizzes("data/quizzes.json");

  console.log(`Mode: ${IS_CHANNEL ? "CHANNEL" : "GROUP/DM"} posting\n`);

  const command = process.argv[2] || "send-all";

  if (command !== "send-all") {
    console.log("Invalid command. Use 'send-all' to send all quizzes.");
    return;
  }

  await bot.run(quizzes, { delayMs: 2000 });
}

async function runApi() {
  const { app, runWorker } = await buildApiServer();
  runWorker();

  const serverPort = Number(PORT || 3000);

  app.listen(serverPort, () => {
    console.log(`API running on port ${serverPort}`);
  });
}

async function main() {
  const command = process.argv[2] || "api";

  if (command === "send-all") {
    await runLegacySendAll();
    return;
  }

  await runApi();
}

main().catch(console.error);
