import { TelegramClient } from "../intergrations/telegram/telegramClient";
import { QuizMediaNormalizer } from "./quizMediaNormalizer";
import { Quiz, QuizSender } from "./quizSender";

interface DispatchQuizUser {
  chatId: string;
  botToken: string;
  isChannel?: boolean;
}

interface DispatchQuizParams {
  user: DispatchQuizUser;
  quizzes: Quiz[];
  cloudinaryCloudName?: string;
  delayMs?: number;
}

interface DispatchFailure {
  index: number;
  message: string;
  status: number | null;
  description: string | null;
}

interface DispatchQuizResult {
  total: number;
  failed: number;
  failures: DispatchFailure[];
}

export class QuizDispatcher {
  public static async dispatchQuizzes({
    user,
    quizzes,
    cloudinaryCloudName,
    delayMs = 2000,
  }: DispatchQuizParams): Promise<DispatchQuizResult> {
    const baseUrl = `https://api.telegram.org/bot${user.botToken}`;
    const mediaNormalizer = new QuizMediaNormalizer({
      cloudName: cloudinaryCloudName,
      chatId: user.chatId,
    });

    const normalizedQuizzes = quizzes.map((quiz) =>
      mediaNormalizer.normalizeQuiz(quiz),
    );

    const sender = new QuizSender({
      telegramClient: new TelegramClient({
        baseUrl,
        isChannel: Boolean(user.isChannel),
      }),
    });

    const failures: DispatchFailure[] = [];

    await sender.sendAll(user.chatId, normalizedQuizzes, {
      delayMs,
      onFailure: async (index, error) => {
        const transportError = error as {
          response?: {
            status?: number;
            data?: {
              description?: string;
            };
          };
        };

        failures.push({
          index,
          message: error.message,
          status: transportError.response?.status || null,
          description: transportError.response?.data?.description || null,
        });
      },
    });

    return {
      total: normalizedQuizzes.length,
      failed: failures.length,
      failures,
    };
  }
}
