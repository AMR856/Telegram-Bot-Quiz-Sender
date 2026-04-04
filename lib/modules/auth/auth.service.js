const { signInOrUpsertUser } = require("../../utils/userStore");
const { sanitizeChatFolderFromChatId } = require("../../utils/quizMedia");
const { verifyBotToken } = require("./telegramAuth.service");

const signInUser = async ({ chatId, botToken, isChannel = true }) => {
  await verifyBotToken(botToken);

  const signed = await signInOrUpsertUser({
    chatId,
    botToken,
    isChannel,
  });

  return {
    user: signed.user,
    apiKey: signed.apiKey,
    cloudinaryFolder: sanitizeChatFolderFromChatId(chatId),
  };
};

module.exports = {
  signInUser,
};
