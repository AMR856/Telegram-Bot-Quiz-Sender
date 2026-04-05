const express = require("express");

const { QuizQueueManager } = require("./lib/config/queue");
const { quizProcesser } = require("./lib/modules/quizzes/quizzes.job.service");
const { MongoConnection } = require("./lib/config/mongo");
const { RateLimiters } = require("./lib/config/rateLimit");
const { auditLog } = require("./lib/logging/auditLog");
const { errorHandler } = require("./lib/utils/errorHandler");
const { healthRouter } = require("./lib/modules/health/health.route");
const { authRouter } = require("./lib/modules/auth/auth.route");
const { imageRouter } = require("./lib/modules/images/images.route");
const { jobsRouter } = require("./lib/modules/jobs/jobs.route");
const { quizzesRouter } = require("./lib/modules/quizzes/quizzes.route");
const { CustomError } = require("./lib/core/customError");
const HttpStatusMessages = require("./lib/core/httpStatusMessages");

const buildApiServer = async () => {
  await MongoConnection.connect();
  const queue = QuizQueueManager.getQueue();

  const app = express();
  app.locals.queue = queue;

  app.use(express.json({ limit: "2mb" }));
  app.use(RateLimiters.globalErrorLimiter);
  app.use("/auth", RateLimiters.authRateLimiter);
  app.use(auditLog);
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/images", imageRouter);
  app.use("/jobs", jobsRouter);
  app.use("/quizzes", quizzesRouter);
  app.use((req, res, next) => {
    next(
      new CustomError(404, "Route not found", {
        statusText: HttpStatusMessages.FAIL,
      }),
    );
  });
  app.use(errorHandler);
  const runWorker = () => {
    const shouldRunWorker =
      String(process.env.RUN_QUEUE_WORKER || "true").toLowerCase() !== "false";

    if (!shouldRunWorker) {
      return null;
    }

    return QuizQueueManager.createWorker(quizProcesser);
  };

  return {
    app,
    runWorker,
  };
};

module.exports = {
  buildApiServer,
};
