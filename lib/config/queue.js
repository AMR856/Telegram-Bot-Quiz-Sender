const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

class QuizQueueManager {
  static #instance = null;
  static #QUEUE_NAME = "quiz-send-jobs";
  static #redisConnection = null;
  static #quizQueue = null;
  static #quizWorker = null;

  static #initializeRedis() {
    if (!this.#redisConnection) {
      this.#redisConnection = new IORedis(
        process.env.REDIS_URL || "redis://127.0.0.1:6379",
        {
          maxRetriesPerRequest: null,
        },
      );
    }
    return this.#redisConnection;
  }

  static #initializeQueue() {
    if (!this.#quizQueue) {
      this.#quizQueue = new Queue(this.#QUEUE_NAME, {
        connection: this.#initializeRedis(),
        defaultJobOptions: {
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
        },
      });
    }
    return this.#quizQueue;
  }

  static getQueue() {
    return this.#initializeQueue();
  }

  static getRedis() {
    return this.#initializeRedis();
  }

  static createWorker(processor) {
    if (!this.#quizWorker) {
      this.#quizWorker = new Worker(this.#QUEUE_NAME, processor, {
        connection: this.#initializeRedis(),
        concurrency: Number(process.env.WORKER_CONCURRENCY || 3),
      });
    }
    return this.#quizWorker;
  }

  static getWorker() {
    return this.#quizWorker;
  }

  static async shutdown() {
    if (this.#quizWorker) {
      await this.#quizWorker.close();
      this.#quizWorker = null;
    }
    if (this.#quizQueue) {
      await this.#quizQueue.close();
      this.#quizQueue = null;
    }
    if (this.#redisConnection) {
      await this.#redisConnection.quit();
      this.#redisConnection = null;
    }
  }
}

module.exports = { QuizQueueManager };
