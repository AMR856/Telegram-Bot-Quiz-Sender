import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import { QuizQueueManager } from "./src/config/queue";
import { quizProcesser } from "./src/modules/quizzes/quizzes.job.service";
import { MongoConnection } from "./src/config/mongo";
import { RateLimiters } from "./src/config/rateLimit";
import { healthRouter } from "./src/modules/health/health.route";
import { imageRouter } from "./src/modules/images/images.route";
import { jobsRouter } from "./src/modules/jobs/jobs.route";
import { quizzesRouter } from "./src/modules/quizzes/quizzes.route";
import CustomError from "./src/utils/customError";
import { HTTPStatusText } from "./src/types/httpStatusText";

interface ApiServer {
  app: Application;
  runWorker: () => any | null;
}

import { authRouter } from "./src/modules/auth/auth.route";
import { auditLog } from "./src/middlewares/auditLog";
import { startHealthPublisher } from "./src/modules/health/health.service";
import { errorHandler } from "./src/utils/errorHandler";

export const buildApiServer = async (): Promise<ApiServer> => {
  await MongoConnection.connect();
  const queue = QuizQueueManager.getQueue();
  const frontendDir = path.resolve(process.cwd(), "../frontend");

  const app: Application = express();

  app.locals.queue = queue;

  const configuredOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowedOrigins = new Set<string>([
    "http://localhost:5500",
    "http://localhost:3000",
    "http://localhost:3001",
    ...configuredOrigins,
  ]);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.static(frontendDir));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
        } else {
          callback(
            new CustomError("Not allowed by CORS", 403, HTTPStatusText.FAIL),
          );
        }
      },
      credentials: true,
    }),
  );

  // app.use(RateLimiters.globalErrorLimiter);
  app.use("/auth", RateLimiters.authRateLimiter);
  app.use(auditLog);

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/images", imageRouter);
  app.use("/jobs", jobsRouter);
  app.use("/quizzes", quizzesRouter);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new CustomError("Route not found", 404, HTTPStatusText.FAIL));
  });

  app.use(errorHandler);

  startHealthPublisher();

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

// Project Structure:
// │   ├── mongo.ts
// │   ├── queue.ts
// │   ├── rateLimit.ts
// │   └── upload.ts
// ├── intergrations
// │   ├── cloudinary
// │   │   └── cloudinaryClient.ts
// │   └── telegram
// │       ├── telegramAuth.ts
// │       └── telegramClient.ts
// ├── middlewares
// │   ├── auditLog.ts
// │   ├── auth.ts
// │   └── validate.ts
// ├── modules
// │   ├── auth
// │   │   ├── auth.controller.ts
// │   │   ├── auth.model.ts
// │   │   ├── auth.route.ts
// │   │   ├── auth.service.ts
// │   │   ├── auth.type.ts
// │   │   └── auth.validation.ts
// │   ├── health
// │   │   ├── health.controller.ts
// │   │   ├── health.route.ts
// │   │   ├── health.service.ts
// │   │   └── health.type.ts
// │   ├── images
// │   │   ├── images.controller.ts
// │   │   ├── images.route.ts
// │   │   ├── images.service.ts
// │   │   └── images.validation.ts
// │   ├── jobs
// │   │   ├── jobs.controller.ts
// │   │   ├── jobs.route.ts
// │   │   ├── jobs.service.ts
// │   │   └── jobs.validation.ts
// │   └── quizzes
// │       ├── quizzes.controller.ts
// │       ├── quizzes.job.service.ts
// │       ├── quizzes.route.ts
// │       ├── quizzes.service.ts
// │       └── quizzes.validation.ts
// ├── services
// │   ├── quizBot.ts
// │   ├── quizDispatcher.ts
// │   ├── quizMediaNormalizer.ts
// │   └── quizSender.ts
// ├── types
// │   └── httpStatusText.ts
// └── utils
//     ├── chatMediaResolver.ts
//     ├── customError.ts
//     ├── errorHandler.ts
//     ├── escaper.ts
//     ├── logger.ts
//     ├── parser.ts
//     └── tokenCipher.ts

// 15 directories, 45 files