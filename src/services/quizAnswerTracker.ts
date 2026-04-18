import { Db, Collection, ObjectId } from "mongodb";
import { MongoConnection } from "../config/mongo";
import { Quiz } from "./quizSender";
import { LoggerService } from "../utils/logger";

interface SentPollRecord {
  _id?: ObjectId;
  ownerUserId: string;
  pollId: string;
  quiz: Quiz;
  retryWrongAfterMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AnswerRecord {
  _id?: ObjectId;
  ownerUserId: string;
  pollId: string;
  telegramUserId: string;
  selectedOptionId: number;
  isCorrect: boolean;
  answeredAt: Date;
  updatedAt: Date;
}

export interface WrongAnswerRetryRecord {
  _id?: ObjectId;
  ownerUserId: string;
  pollId: string;
  telegramUserId: string;
  quiz: Quiz;
  dueAt: Date;
  attempts: number;
  status: "pending" | "processing" | "sent" | "skipped";
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TrackSentPollParams {
  ownerUserId: string;
  pollId: string;
  quiz: Quiz;
  retryWrongAfterMinutes: number;
}

interface TrackPollAnswerParams {
  ownerUserId: string;
  pollId: string;
  telegramUserId: string;
  telegramUserIsBot?: boolean;
  selectedOptionIds: number[];
}

export class QuizAnswerTracker {
  private static readonly POLLS_COLLECTION = "quiz_sent_polls";
  private static readonly ANSWERS_COLLECTION = "quiz_answers";
  private static readonly RETRIES_COLLECTION = "quiz_wrong_retries";
  private static indexesEnsured = false;

  private static getDb(): Db {
    return MongoConnection.getDb();
  }

  // Collection getters for accessing the MongoDB collections used to store sent polls, user answers, and retry records for wrong answers. These methods provide a centralized way to interact with the database and ensure that the correct collections are used for each type of data.
  private static getPollsCollection(): Collection<SentPollRecord> {
    return this.getDb().collection(this.POLLS_COLLECTION);
  }

  private static getAnswersCollection(): Collection<AnswerRecord> {
    return this.getDb().collection(this.ANSWERS_COLLECTION);
  }

  private static getRetriesCollection(): Collection<WrongAnswerRetryRecord> {
    return this.getDb().collection(this.RETRIES_COLLECTION);
  }

  private static async ensureIndexes(): Promise<void> {
    if (this.indexesEnsured) {
      return;
    }

    // Ensuring that the necessary indexes exist on the polls, answers, and retries collections to optimize query performance and enforce uniqueness constraints on relevant fields for tracking sent polls, user answers, and retry records for wrong answers.
    await this.getPollsCollection().createIndexes([
      {
        key: { ownerUserId: 1, pollId: 1 },
        unique: true,
        name: "uniq_owner_poll",
      },
      // 1 -> ascending
      { key: { createdAt: 1 }, name: "poll_created_idx" },
    ]);

    await this.getAnswersCollection().createIndexes([
      {
        key: { ownerUserId: 1, pollId: 1, telegramUserId: 1 },
        unique: true,
        name: "uniq_owner_poll_user",
      },
      // -1 -> descending
      { key: { answeredAt: -1 }, name: "answered_at_idx" },
    ]);

    await this.getRetriesCollection().createIndexes([
      {
        key: { ownerUserId: 1, pollId: 1, telegramUserId: 1 },
        unique: true,
        name: "uniq_retry_owner_poll_user",
      },
      // 1 -> ascending
      // -1 -> descending
      { key: { status: 1, dueAt: 1 }, name: "status_due_idx" },
      { key: { updatedAt: -1 }, name: "retry_updated_idx" },
    ]);

    // Now the indexes are set
    this.indexesEnsured = true;
  }

  public static async trackSentPoll({
    ownerUserId,
    pollId,
    quiz,
    retryWrongAfterMinutes,
  }: TrackSentPollParams): Promise<void> {
    // Ensuring that the necessary indexes exist before tracking the sent poll to optimize query performance and enforce uniqueness constraints on the polls collection,
    // which is crucial for accurately tracking sent polls and managing retries for wrong answers.
    await this.ensureIndexes();

    const now = new Date();

    // Inserting or updating the record of the sent poll in the polls collection with the associated quiz data and retry configuration.
    // This allows the system to keep track of which quizzes have been sent, their correct answers, and how to handle retries for wrong answers based on the specified retry interval.
    await this.getPollsCollection().updateOne(
      { ownerUserId, pollId },
      {
        $set: {
          quiz,
          retryWrongAfterMinutes: Number(retryWrongAfterMinutes || 0),
          updatedAt: now,
        },
        $setOnInsert: {
          ownerUserId,
          pollId,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  public static async trackPollAnswer({
    ownerUserId,
    pollId,
    telegramUserId,
    telegramUserIsBot = false,
    selectedOptionIds,
  }: TrackPollAnswerParams): Promise<void> {
    // Ensure indexes
    await this.ensureIndexes();

    // Retrieving the record of the sent poll from the polls collection to access the quiz data and retry configuration,
    // which is necessary for determining whether the user's answer is correct and how to manage retries for wrong answers based on the quiz's correct answer and the specified retry interval.
    const sentPoll = await this.getPollsCollection().findOne({
      ownerUserId,
      pollId,
    });

    if (!sentPoll) {
      return;
    }

    // Determining whether the user's selected option ID matches the correct answer ID from the quiz data, which allows the system to track whether the user's answer is correct and to manage retries for wrong answers accordingly.
    const selectedOptionId =
      Array.isArray(selectedOptionIds) && selectedOptionIds.length > 0
        ? Number(selectedOptionIds[0])
        : -1;

    const isCorrect =
      selectedOptionId === Number(sentPoll.quiz.correctAnswerId);
    const now = new Date();

    // Inserting or updating the user's answer record in the answers collection with the selected option ID, correctness status, and timestamps.
    // This allows the system to keep track of users' answers to quiz questions and to manage retries for wrong answers based on the recorded answers and the associated quiz data.
    await this.getAnswersCollection().updateOne(
      { ownerUserId, pollId, telegramUserId },
      {
        $set: {
          selectedOptionId,
          isCorrect,
          answeredAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          ownerUserId,
          pollId,
          telegramUserId,
        },
      },
      { upsert: true },
    );

    // If the user's answer is correct, any existing retry record for that user and poll is deleted from the retries collection, as there is no need to manage retries for correct answers.
    if (isCorrect) {
      await this.getRetriesCollection().deleteOne({
        ownerUserId,
        pollId,
        telegramUserId,
      });
      return;
    }
    LoggerService.info(`User ${telegramUserId} answered incorrectly for poll ${pollId}. Checking retry configuration...`);

    if (telegramUserIsBot) {
      LoggerService.warn(
        `Skipping retry scheduling for poll ${pollId} because responder ${telegramUserId} is a bot account`,
      );
      await this.getRetriesCollection().deleteOne({
        ownerUserId,
        pollId,
        telegramUserId,
      });
      return;
    }


    // If the user's answer is wrong and the quiz has a retry configuration, a retry record is inserted or updated in the retries collection with the associated quiz data, due date for retrying, and status.
    if (Number(sentPoll.retryWrongAfterMinutes || 0) <= 0) {
      return;
    }

    LoggerService.info(`Quiz has retry configuration. Scheduling retry for user ${telegramUserId} after ${sentPoll.retryWrongAfterMinutes} minutes.`);
    // Calculating the due date for retrying the quiz question based on the current time and the specified retry interval for wrong answers, which allows the system to manage retries for wrong answers by determining when to attempt resending the quiz question to the user.
    const dueAt = new Date(
      now.getTime() + Number(sentPoll.retryWrongAfterMinutes) * 60 * 1000,
    );

    // Inserting or updating the retry record for the wrong answer in the retries collection with the associated quiz data, due date for retrying, and status.
    // This allows the system to manage retries for wrong answers by keeping track of which quiz questions need to be retried for which users and when they are due for retrying.
    await this.getRetriesCollection().updateOne(
      { ownerUserId, pollId, telegramUserId },
      {
        $set: {
          quiz: sentPoll.quiz,
          dueAt,
          status: "pending",
          lastError: null,
          updatedAt: now,
        },
        $setOnInsert: {
          ownerUserId,
          pollId,
          telegramUserId,
          attempts: 0,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  public static async pullDueRetries(
    limit = 50,
  ): Promise<WrongAnswerRetryRecord[]> {
    await this.ensureIndexes();

    const now = new Date();

    // Querying the retries collection to retrieve a batch of retry records that are due for retrying (i.e., those with a pending status and a due date that has passed), sorted by due date in ascending order.
    // This allows the system to efficiently manage retries for wrong answers by processing the retry records that are due for retrying in a timely manner.
    return this.getRetriesCollection()
      .find({
        status: "pending",
        dueAt: { $lte: now },
      })
      .sort({ dueAt: 1 })
      .limit(Math.max(1, limit))
      .toArray();
  }

  public static async markRetryProcessing(id: ObjectId): Promise<boolean> {
    await this.ensureIndexes();

    // Attempting to atomically update the status of the retry record to "processing" if it is currently "pending", which allows the system to claim the retry record for processing and prevents multiple workers from processing the same retry record concurrently.
    const result = await this.getRetriesCollection().updateOne(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "processing",
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  public static async markRetrySent(id: ObjectId): Promise<void> {
    await this.ensureIndexes();

    // Updating the status of the retry record to "sent" after successfully sending the quiz question to the user, which allows the system to keep track of the retry records that have been processed and sent to users.
    await this.getRetriesCollection().updateOne(
      { _id: id },
      {
        $set: {
          status: "sent",
          updatedAt: new Date(),
          lastError: null,
        },
      },
    );
  }

  public static async markRetrySkipped(
    id: ObjectId,
    reason: string,
  ): Promise<void> {
    await this.ensureIndexes();

    await this.getRetriesCollection().updateOne(
      { _id: id },
      {
        $set: {
          status: "skipped",
          updatedAt: new Date(),
          lastError: reason,
        },
      },
    );
  }

  public static async markRetryFailed(
    id: ObjectId,
    errorMessage: string,
    retryAfterMinutes = 5,
  ): Promise<void> {
    await this.ensureIndexes();

    const now = new Date();
    const dueAt = new Date(now.getTime() + retryAfterMinutes * 60 * 1000);

    // Updating the retry record with a new due date for retrying and the error message after a failed attempt to send the quiz question, which allows the system to manage retries for wrong answers by rescheduling the retry attempt and keeping track of any errors that occur during the retry process.
    await this.getRetriesCollection().updateOne(
      { _id: id },
      {
        $set: {
          status: "pending",
          dueAt,
          updatedAt: now,
          lastError: errorMessage,
        },
        $inc: {
          attempts: 1,
        },
      },
    );
  }
}
