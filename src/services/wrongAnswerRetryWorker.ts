import { TelegramClient } from "../intergrations/telegram/telegramClient";
import { UserModel } from "../modules/auth/auth.model";
import { LoggerService } from "../utils/logger";
import { QuizSender } from "./quizSender";
import { QuizAnswerTracker, WrongAnswerRetryRecord } from "./quizAnswerTracker";

export class WrongAnswerRetryWorker {
  // This worker periodically checks for quizzes that were marked for retry after a wrong answer and attempts to resend them to the user.
  // It uses a locking mechanism to ensure that only one instance of the worker processes a given retry record at a time.
  // If resending fails, it applies an exponential backoff strategy to schedule the next retry attempt.
  private static intervalRef: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static isProcessing = false;

  public static start(): void {
    if (this.isRunning) {
      return;
    }

    // Check if the worker is enabled via environment variable before starting. This allows for flexibility in deployment and resource management, as the worker can be disabled if not needed or if it causes performance issues.
    const enabled =
      String(
        process.env.RUN_WRONG_ANSWER_RETRY_WORKER || "true",
      ).toLowerCase() !== "false";

    if (!enabled) {
      LoggerService.info("Wrong answer retry worker is disabled");
      return;
    }

    // Set up a periodic interval to run the worker's tick function, which checks for due retries and processes them. The interval duration can be configured via environment variable, with a minimum of 5 seconds to prevent excessive load on the system.
    const intervalMs = Number(
      process.env.WRONG_ANSWER_RETRY_INTERVAL_MS || 30000,
    );
    this.intervalRef = setInterval(
      () => {
        void this.tick();
      },
      Math.max(5000, intervalMs),
    );
    this.isRunning = true;

    // First run immediately at startup.
    void this.tick();
  }

  public static stop(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
    this.isRunning = false;
  }

  private static async tick(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    // Set the processing flag to true to prevent overlapping executions of the tick function, which could lead to race conditions or duplicate processing of retry records. The flag is reset to false at the end of the function, allowing the next tick to proceed.
    this.isProcessing = true;

    try {
      // Pull a batch of due retries from the QuizAnswerTracker service, which manages the records of quizzes that need to be retried after wrong answers. The batch size can be configured via environment variable to balance between processing efficiency and system load.
      const batchSize = Number(process.env.WRONG_ANSWER_RETRY_BATCH_SIZE || 50);
      // Getting the due retries involves querying the database for records that are marked as "pending" and have a dueAt timestamp that is in the past, indicating that they are ready to be retried. The records are returned in batches to allow for efficient processing without overwhelming the system.
      const dueRetries = await QuizAnswerTracker.pullDueRetries(batchSize);

      // Process each due retry record sequentially. For each record, the worker attempts to resend the quiz to the user using the QuizSender service. If the resend is successful, the record is marked as "sent". If it fails, the record is updated with the error message and scheduled for another retry after a certain delay, which can be configured via environment variable.
      for (const item of dueRetries) {
        await this.processOne(item);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      LoggerService.error(`Wrong answer retry tick failed: ${message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processOne(item: WrongAnswerRetryRecord): Promise<void> {
    // If the retry record does not have an ID, it cannot be processed, as the ID is necessary for tracking the status of the retry and updating it in the database. This check ensures that only valid records are processed and prevents potential errors or inconsistencies in the retry management.
    if (!item._id) {
      return;
    }

    // Attempt to claim the retry record for processing by marking it as "processing" in the database. This serves as a lock to prevent multiple instances of the worker from processing the same record simultaneously,
    // which could lead to duplicate resends or race conditions.
    // If the claim is successful, the worker proceeds to process the record;
    // if not, it means another instance has already claimed it, and the worker will skip this record.
    const claimed = await QuizAnswerTracker.markRetryProcessing(item._id);

    if (!claimed) {
      return;
    }

    try {
      const owner = await UserModel.getUserById(item.ownerUserId);

      // If the owner user cannot be found, it means that the retry record is invalid or orphaned, as it references a user that does not exist in the system. In this case, the worker will throw an error and skip processing this record, as it cannot resend the quiz without a valid user context.
      if (!owner) {
        throw new Error(`Retry owner user not found: ${item.ownerUserId}`);
      }

      // Constructing a sender instance to resend the quiz to the user. The sender is configured with a TelegramClient that uses the bot token from the owner user to authenticate with the Telegram API. The sender will attempt to resend the quiz associated with the retry record to the Telegram user ID specified in the record.
      const sender = new QuizSender({
        telegramClient: new TelegramClient({
          baseUrl: `https://api.telegram.org/bot${owner.botToken}`,
          isChannel: false,
        }),
        isChannel: false,
      });

      // Sending the quiz to the user and marking the retry as sent if successful. If the send operation fails, an error is caught, and the retry record is updated with the error message and scheduled for another retry after a certain delay, which can be configured via environment variable. This allows for robust handling of transient errors and ensures that users have multiple opportunities to receive the quiz even if there are temporary issues with the Telegram API or network connectivity.
      await sender.sendQuiz(item.telegramUserId, item.quiz);

      // Mark the quiz as sent
      await QuizAnswerTracker.markRetrySent(item._id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const baseDelayMinutes = Number(
        process.env.WRONG_ANSWER_RETRY_BACKOFF_MINUTES || 5,
      );
      // Calculating the retry delay using an exponential backoff strategy based on the number of attempts. The delay increases with each failed attempt to prevent overwhelming the system and to allow time for transient issues to resolve. The delay is also capped at a maximum value to avoid excessively long wait times between retries.
      const retryAfterMinutes = Math.min(Math.max(1, baseDelayMinutes), 120);

      // Mark the retry as failed and schedule the next retry attempt after the calculated delay. This involves updating the retry record in the database with the error message and setting a new dueAt timestamp that is the current time plus the retry delay. This allows the worker to pick up this record again in a future tick and attempt to resend the quiz again.
      await QuizAnswerTracker.markRetryFailed(
        item._id,
        message,
        retryAfterMinutes,
      );

      LoggerService.warn(
        `Failed to resend wrong-answer quiz for user ${item.telegramUserId}: ${message}`,
      );
    }
  }
}
