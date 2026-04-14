import { TelegramAuth } from "../../intergrations/telegram/telegramAuth";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";
import { UserStore } from "./auth.model";
import { SignInUserParams, SignInUserResult } from "./auth.type";

export class AuthService {
  public static async signInUser({
    chatId,
    botToken,
    isChannel = true,
  }: SignInUserParams): Promise<SignInUserResult> {
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
  }
}
