import fs from "fs";
import { logger } from "./logger";
import { QuizMediaNormalizer } from "../services/quizMediaNormalizer";
import { HTTPStatusText } from "../types/httpStatusText";
import CustomError from "./customError";

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
      // Read the quizzes file and parse it as JSON. The file is expected to contain an array of quiz objects.
      const quizzes = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!Array.isArray(quizzes)) {
        throw new CustomError("Quizzes file must contain an array of quizzes.", 400, HTTPStatusText.FAIL);
      }

      // Create an instance of QuizMediaNormalizer to normalize the media paths in the quizzes. 
      // The normalizer is configured with the base file path, Cloudinary cloud name, and chat ID from the options.
      const normalizer = new QuizMediaNormalizer({
        baseFilePath: filePath,
        cloudName: options.cloudinaryCloudName,
        chatId: options.chatId,
      });

      // Normalize each quiz in the quizzes array using the normalizer's normalizeQuiz method.
      return quizzes.map((quiz) => normalizer.normalizeQuiz(quiz));
    } catch (error: any) {
      logger.error(`Error loading quizzes: ${error.message}`);
      return [];
    }
  }
}
