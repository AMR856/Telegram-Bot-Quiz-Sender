import { Queue, Worker, Processor, Job, DefaultJobOptions } from "bullmq";
import IORedis, { Redis } from "ioredis";

interface QuizJobData {
  quizId: string;
  userIds: string[];
  payload: any;
}

export class QuizQueueManager {
  private static readonly QUEUE_NAME = "quiz-send-jobs";
  private static redisConnection: Redis | null = null;
  private static quizQueue: Queue<QuizJobData> | null = null;
  private static quizWorker: Worker<QuizJobData> | null = null;

  private static initializeRedis(): Redis {
    if (!this.redisConnection) {
      this.redisConnection = new IORedis(
        process.env.REDIS_URL || "redis://127.0.0.1:6379",
        {
          maxRetriesPerRequest: null,
        },
      );
    }
    return this.redisConnection;
  }

  private static initializeQueue(): Queue<QuizJobData> {
    if (!this.quizQueue) {
      const defaultJobOptions: DefaultJobOptions = {
        removeOnComplete: {
          age: Number(process.env.JOB_RETENTION_SECONDS || 24 * 60 * 60),
          count: Number(process.env.JOB_RETENTION_COUNT || 5000),
        },
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      };

      this.quizQueue = new Queue(this.QUEUE_NAME, {
        connection: this.initializeRedis(),
        defaultJobOptions,
      });
    }
    return this.quizQueue;
  }

  public static getQueue(): Queue<QuizJobData> {
    return this.initializeQueue();
  }

  public static getRedis(): Redis {
    return this.initializeRedis();
  }

  public static createWorker(
    processor: Processor<QuizJobData>,
  ): Worker<QuizJobData> {
    if (!this.quizWorker) {
      this.quizWorker = new Worker(this.QUEUE_NAME, processor, {
        connection: this.initializeRedis(),
        concurrency: Number(process.env.WORKER_CONCURRENCY || 3),
      });
    }
    return this.quizWorker;
  }

  public static getWorker(): Worker<QuizJobData> | null {
    return this.quizWorker;
  }

  public static async shutdown(): Promise<void> {
    if (this.quizWorker) {
      await this.quizWorker.close();
      this.quizWorker = null;
    }
    if (this.quizQueue) {
      await this.quizQueue.close();
      this.quizQueue = null;
    }
    if (this.redisConnection) {
      await this.redisConnection.quit();
      this.redisConnection = null;
    }
  }
}
