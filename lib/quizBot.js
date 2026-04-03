const { appendLog } = require("../utils/appendLog");
const { parseQuizzes } = require("../utils/parseQuizzes");
const { TelegramClient } = require("./telegramClient");
const { QuizSender } = require("./quizSender");

class QuizBot {
  constructor({ chatId, baseUrl, isChannel, successLogFile, failedLogFile }) {
    if (!chatId) {
      throw new Error("CHAT_ID is required.");
    }

    this.chatId = chatId;
    this.successLogFile = successLogFile;
    this.failedLogFile = failedLogFile;
    this.sender = new QuizSender({
      telegramClient: new TelegramClient({ baseUrl, isChannel }),
    });
  }

  async loadQuizzes(filePath) {
    return parseQuizzes(filePath);
  }

  async run(quizzes, { delayMs = 2000 } = {}) {
    await this.sender.sendAll(this.chatId, quizzes, {
      delayMs,
      onSuccess: async (index) => {
        const message = `Successfully sent quiz at index ${index}`;
        await appendLog(this.successLogFile, message);
      },
      onFailure: async (index, error) => {
        if (error.response?.status === 400) {
          const failureDescription =
            error.response?.data?.description || error.message;
          const failedMessage = `Failed to send quiz ${index + 1} (status 400): ${failureDescription}`;
          await appendLog(this.failedLogFile, failedMessage);
        }
        const skipMessage = `Failed to send quiz at index ${index}: ${error.message}`;
        await appendLog(this.failedLogFile, skipMessage);
      },
    });
  }
}

module.exports = { QuizBot };
