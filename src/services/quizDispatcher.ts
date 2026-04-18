import { TelegramClient } from "../intergrations/telegram/telegramClient";
import { QuizMediaNormalizer } from "./quizMediaNormalizer";
import { Quiz, QuizSender } from "./quizSender";
import { QuizAnswerTracker } from "./quizAnswerTracker";

interface DispatchQuizUser {
  id: string;
  chatId: string;
  botToken: string;
  isChannel?: boolean;
}

interface DispatchQuizParams {
  user: DispatchQuizUser;
  quizzes: Quiz[];
  cloudinaryCloudName?: string;
  delayMs?: number;
  retryWrongAfterMinutes?: number;
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
    retryWrongAfterMinutes = 0,
  }: DispatchQuizParams): Promise<DispatchQuizResult> {
    const baseUrl = `https://api.telegram.org/bot${user.botToken}`;
    // Create an instance of QuizMediaNormalizer to normalize the media paths in the quizzes. 
    // The normalizer is configured with the Cloudinary cloud name and chat ID from the user object.
    const mediaNormalizer = new QuizMediaNormalizer({
      cloudName: cloudinaryCloudName,
      chatId: user.chatId,
    });

    // Normalize each quiz in the quizzes array using the normalizer's normalizeQuiz method.
    const normalizedQuizzes = quizzes.map((quiz) =>
      mediaNormalizer.normalizeQuiz(quiz),
    );

    // Create an instance of QuizSender to send the quizzes to Telegram. The QuizSender is initialized with a TelegramClient that is configured with the base URL and channel status from the user object.
    const sender = new QuizSender({
      telegramClient: new TelegramClient({
        baseUrl,
        isChannel: Boolean(user.isChannel),
      }),
      isChannel: Boolean(user.isChannel),
    });

    const failures: DispatchFailure[] = [];

    await sender.sendAll(user.chatId, normalizedQuizzes, {
      delayMs,
      // When a quiz is successfully sent and a poll is created in Telegram, the onPollSent callback is triggered. 
      // This callback is responsible for tracking the sent poll in the QuizAnswerTracker service, 
      // which allows the application to keep track of which quizzes have been sent to which users and manage retries for wrong answers after a certain time.
      onPollSent: async (_index, pollId, quiz) => {
        await QuizAnswerTracker.trackSentPoll({
          ownerUserId: user.id,
          pollId,
          quiz,
          retryWrongAfterMinutes,
        });
      },
      onFailure: async (index, error) => {
        const transportError = error as {
          response?: {
            status?: number;
            data?: {
              description?: string;
            };
          };
        };
        // If sending a quiz fails, the failure is recorded in the failures array with the index of the quiz, the error message, 
        // and any relevant status and description from the Telegram API response.
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
