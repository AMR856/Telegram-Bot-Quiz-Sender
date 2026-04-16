import { TelegramAuth } from "../../intergrations/telegram/telegramAuth";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";
import { UserModel } from "./auth.model";
import { SignInUserParams, SignInUserResult } from "./auth.type";

export class AuthService {
  public static async signInUser({
    chatId,
    botToken,
    isChannel = true,
  }: SignInUserParams): Promise<SignInUserResult> {
    // Validate bot token by making a request to Telegram API
    await TelegramAuth.verifyBotToken(botToken);

    
    const signed = await UserModel.signInOrUpsert({
      chatId,
      botToken,
      isChannel,
    });

    return {
      user: signed.user,
      apiKey: signed.apiKey,
      cloudinaryFolder: ChatFolderResolver.resolveFolderName(chatId),
    };
  }
}
