import fs from "fs";
import { logger } from "./logger";
import { QuizMediaNormalizer } from "../services/quizMediaNormalizer";

export interface ParseQuizzesOptions {
  cloudinaryCloudName?: string;
  chatId?: string;
}

export class Parser {
  public static parseQuizzes(
    filePath: string,
    options: ParseQuizzesOptions = {},
  ) {
    try {
      const quizzes = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!Array.isArray(quizzes)) {
        throw new Error("Quizzes file must contain an array of quizzes.");
      }

      const normalizer = new QuizMediaNormalizer({
        baseFilePath: filePath,
        cloudName: options.cloudinaryCloudName,
        chatId: options.chatId,
      });

      return quizzes.map((quiz) => normalizer.normalizeQuiz(quiz));
    } catch (error: any) {
      logger.error(`Error loading quizzes: ${error.message}`);
      return [];
    }
  }
}

