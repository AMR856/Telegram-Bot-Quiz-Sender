const { signInOrUpsertUser } = require("../../stores/userStore");
const { ChatFolderResolver } = require("../../utils/quizMedia");
const verifyBotToken = require("./telegram.auth.service");

class AuthService {
  static signInUser = async ({ chatId, botToken, isChannel = true }) => {
    await verifyBotToken(botToken);

    const signed = await signInOrUpsertUser({
      chatId,
      botToken,
      isChannel,
    });

    return {
      user: signed.user,
      apiKey: signed.apiKey,
      cloudinaryFolder: ChatFolderResolver.resolveFolderName(chatId),
    };
  };
}

module.exports = AuthService;
