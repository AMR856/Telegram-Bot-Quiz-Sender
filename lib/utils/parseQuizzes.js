const fs = require("fs");
const { QuizMediaNormalizer } = require("./quizMedia");
const { logger } = require("../logging/logger");

const parseQuizzes = (filePath, options = {}) => {
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
  } catch (error) {
    logger.error(`Error loading quizzes: ${error.message}`);
    return [];
  }
};

module.exports = { parseQuizzes };
