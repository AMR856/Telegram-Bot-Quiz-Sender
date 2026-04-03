const fs = require("fs");

const parseQuizzes = (filePath) => {
  try {
    const quizzes = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(quizzes)) {
      throw new Error("Quizzes file must contain an array of quizzes.");
    }
    return quizzes;
  } catch (error) {
    console.error("Error loading quizzes:", error.message);
    return [];
  }
};

module.exports = { parseQuizzes };