import { logToFile } from "../utils/logger";
import { TelegramClient } from "../intergrations/telegram/telegramClient";
import { Parser } from "../utils/parser";
import { QuizSender } from "./quizSender";

interface QuizBotConfig {
  chatId: string;
  baseUrl: string;
  isChannel?: boolean;
  cloudinaryCloudName?: string;
  successLogFile?: string;
  failedLogFile?: string;
}

interface QuizBotRunOptions {
  delayMs?: number;
}

export class QuizBot {
  private readonly chatId: string;
  private readonly cloudinaryCloudName?: string;
  private readonly successLogFile?: string;
  private readonly failedLogFile?: string;
  private readonly sender: QuizSender;

  constructor({
    chatId,
    baseUrl,
    isChannel,
    cloudinaryCloudName,
    successLogFile,
    failedLogFile,
  }: QuizBotConfig) {
    if (!chatId) {
      throw new Error("CHAT_ID is required.");
    }

    this.chatId = chatId;
    this.cloudinaryCloudName = cloudinaryCloudName;
    this.successLogFile = successLogFile;
    this.failedLogFile = failedLogFile;
    this.sender = new QuizSender({
      telegramClient: new TelegramClient({ baseUrl, isChannel }),
    });
  }

  public async loadQuizzes(filePath: string) {
    return Parser.parseQuizzes(filePath, {
      chatId: this.chatId,
      cloudinaryCloudName: this.cloudinaryCloudName,
    });
  }

  public async run(quizzes: any[], { delayMs = 2000 }: QuizBotRunOptions = {}) {
    await this.sender.sendAll(this.chatId, quizzes, {
      delayMs,
      onSuccess: async (index) => {
        const message = `Successfully sent quiz at index ${index}`;
        await logToFile(this.successLogFile, message);
      },
      onFailure: async (index, error) => {
        const transportError = error as {
          response?: {
            status?: number;
            data?: {
              description?: string;
            };
          };
          message?: string;
        };

        if (transportError.response?.status === 400) {
          const failureDescription =
            transportError.response?.data?.description ||
            transportError.message ||
            "Unknown error";
          const failedMessage = `Failed to send quiz ${index + 1} (status 400): ${failureDescription}`;
          await logToFile(this.failedLogFile, failedMessage, "warn");
        }
        const skipMessage = `Failed to send quiz at index ${index}: ${transportError.message || "Unknown error"}`;
        await logToFile(this.failedLogFile, skipMessage, "warn");
      },
    });
  }
}
