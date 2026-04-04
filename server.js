const express = require("express");

const { createQuizQueue, createQuizWorker } = require("./queue");
const { buildModulesRouter } = require("./lib/modules");
const { buildSendQuizzesProcessor } = require("./lib/modules/quizzes/quizzes.job.service");
const { connectMongo } = require("./lib/db/mongo");
const { buildUpload } = require("./lib/config/upload");
const {
  buildGlobalRateLimiter,
  buildAuthRateLimiter,
} = require("./lib/config/rateLimit");
const { buildAuditLogMiddleware } = require("./lib/middlewares/auditLog");
const { errorHandler } = require("./lib/middlewares/errorHandler");
const { createHttpError } = require("./lib/utils/httpError");

const buildApiServer = async () => {
  await connectMongo();

  const app = express();
  const queue = createQuizQueue();
  const upload = buildUpload();

  const globalRateLimiter = buildGlobalRateLimiter();
  const authRateLimiter = buildAuthRateLimiter();

  app.use(express.json({ limit: "2mb" }));
  app.use(globalRateLimiter);
  app.use("/auth", authRateLimiter);
  app.use(buildAuditLogMiddleware());
  app.use(buildModulesRouter({ queue, upload }));
  app.use((req, res, next) => {
    next(createHttpError(404, "Route not found"));
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
