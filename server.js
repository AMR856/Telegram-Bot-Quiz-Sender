const express = require("express");

const { createQuizWorker } = require("./queue");
const {
  buildSendQuizzesProcessor,
} = require("./lib/modules/quizzes/quizzes.job.service");
const { connectMongo } = require("./lib/db/mongo");
const { RateLimiters } = require("./lib/config/rateLimit");
const { buildAuditLogMiddleware } = require("./lib/middlewares/auditLog");
const { errorHandler } = require("./lib/utils/errorHandler");
const { healthRouter } = require("./lib/modules/health/health.route");
const { authRouter } = require("./lib/modules/auth/auth.route");
const { imageRouter } = require("./lib/modules/images/images.route");
const { jobsRouter } = require("./lib/modules/jobs/jobs.route");
const { buildQuizzesRouter } = require("./lib/modules/quizzes/quizzes.route");
const { CustomError } = require("./lib/models/customError");
const HttpStatusMessages = require("./lib/models/httpStatusMessages");

const buildApiServer = async () => {
  await connectMongo();

  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(RateLimiters.globalErrorLimiter);
  app.use("/auth", RateLimiters.authRateLimiter);
  app.use(buildAuditLogMiddleware());
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/images", imageRouter);
  app.use("/jobs", jobsRouter);
  app.use("/quizzes", buildQuizzesRouter({ queue }));
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

    return createQuizWorker(
      buildSendQuizzesProcessor({
        cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
      }),
    );
  };

  return {
    app,
    runWorker,
  };
};

module.exports = {
  buildApiServer,
};
