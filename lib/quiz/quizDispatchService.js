const { QuizSender } = require("./quizSender");
const { TelegramClient } = require("../integrations/telegramClient");
const { normalizeQuizObjectMedia } = require("../utils/quizMedia");

const sendQuizzesForUser = async ({
  user,
  quizzes,
  cloudinaryCloudName,
  delayMs = 2000,
}) => {
  const baseUrl = `https://api.telegram.org/bot${user.botToken}`;

  const normalizedQuizzes = quizzes.map((quiz) =>
    normalizeQuizObjectMedia(quiz, {
      cloudinaryCloudName,
      chatId: user.chatId,
    }),
  );

  const sender = new QuizSender({
    telegramClient: new TelegramClient({
      baseUrl,
      isChannel: Boolean(user.isChannel),
    }),
  });

  const failures = [];

  await sender.sendAll(user.chatId, normalizedQuizzes, {
    delayMs,
    onFailure: async (index, error) => {
      failures.push({
        index,
        message: error.message,
        status: error.response?.status || null,
        description: error.response?.data?.description || null,
      });
    },
  });

  return {
    total: normalizedQuizzes.length,
    failed: failures.length,
    failures,
  };
};

module.exports = {
  sendQuizzesForUser,
};
