const { UserStore } = require("../../stores/userStore");
const { ChatFolderResolver } = require("../../services/normalizers");
const { TelegramAuth } = require("../../intergrations/telegram/telegramAuth");

class AuthService {
  static signInUser = async ({ chatId, botToken, isChannel = true }) => {
    await TelegramAuth.verifyBotToken(botToken);

    const signed = await UserStore.signInOrUpsert({
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
