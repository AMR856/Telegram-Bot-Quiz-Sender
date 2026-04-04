const fs = require("fs");
const { normalizeQuizObjectMedia } = require("./quizMedia");

const parseQuizzes = (filePath, options = {}) => {
  try {
    const quizzes = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(quizzes)) {
      throw new Error("Quizzes file must contain an array of quizzes.");
    }

    return quizzes.map((quiz) => ({
      ...normalizeQuizObjectMedia(quiz, {
        baseFilePath: filePath,
        cloudinaryCloudName: options.cloudinaryCloudName,
        chatId: options.chatId,
      }),
    }));
  } catch (error) {
    console.error("Error loading quizzes:", error.message);
    return [];
  }
};

module.exports = { parseQuizzes };