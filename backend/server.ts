import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import cors from "cors";
import { QuizQueueManager } from "./lib/config/queue";
import { quizProcesser } from "./lib/modules/quizzes/quizzes.job.service";
import { MongoConnection } from "./lib/config/mongo";
import { RateLimiters } from "./lib/config/rateLimit";
import { healthRouter } from "./lib/modules/health/health.route";
import { imageRouter } from "./lib/modules/images/images.route";
import { jobsRouter } from "./lib/modules/jobs/jobs.route";
import { quizzesRouter } from "./lib/modules/quizzes/quizzes.route";
import CustomError from "./lib/utils/customError";
import { HTTPStatusText } from "./lib/types/httpStatusText";

interface ApiServer {
  app: Application;
  runWorker: () => any | null;
}

import { authRouter } from "./lib/modules/auth/auth.route";
import { auditLog } from "./lib/middlewares/auditLog";
import { errorHandler } from "./lib/utils/errorHandler";

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

  app.use(RateLimiters.globalErrorLimiter);
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
