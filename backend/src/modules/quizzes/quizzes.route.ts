import express from "express";
import { authMiddleware } from "../../middlewares/auth";
import { validate } from "../../middlewares/validate";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesValidationSchema } from "./quizzes.validation";

export const quizzesRouter = express.Router();

quizzesRouter.post(
  "/send",
  authMiddleware,
  validate({ body: QuizzesValidationSchema.sendQuizzesBodySchema }),
  QuizzesController.send,
);
