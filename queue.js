const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");

const QUEUE_NAME = "quiz-send-jobs";

const buildConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};

const createQuizQueue = () =>
  new Queue(QUEUE_NAME, {
    connection: buildConnection(),
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

const createQuizWorker = (processor) =>
  new Worker(QUEUE_NAME, processor, {
    connection: buildConnection(),
    concurrency: Number(process.env.WORKER_CONCURRENCY || 3),
  });

module.exports = {
  QUEUE_NAME,
  createQuizQueue,
  createQuizWorker,
};
