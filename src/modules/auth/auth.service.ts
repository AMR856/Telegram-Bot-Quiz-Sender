import { TelegramAuth } from "../../intergrations/telegram/telegramAuth";
import { ChatFolderResolver } from "../../utils/chatMediaResolver";
import { LoggerService } from "../../utils/logger";
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

    const webhookBaseUrl = String(process.env.WEBHOOK_BASE_URL || "").trim();
    const shouldRegisterWebhook =
      String(process.env.REGISTER_WEBHOOK_ON_SIGNIN || "true").toLowerCase() !==
      "false";

    let webhookUrl: string | undefined;

    if (webhookBaseUrl) {
      const normalizedBase = webhookBaseUrl.replace(/\/+$/, "");
      const currentUser = await UserModel.getUserById(signed.user.id);

      if (currentUser) {
        webhookUrl = `${normalizedBase}/telegram/webhook/${currentUser.id}/${currentUser.webhookSecret}`;

        if (shouldRegisterWebhook) {
          try {
            await TelegramAuth.setWebhook({
              botToken,
              webhookUrl,
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            LoggerService.warn(`Failed to auto-register Telegram webhook: ${message}`);
          }
        }
      }
    }

    return {
      user: signed.user,
      apiKey: signed.apiKey,
      cloudinaryFolder: ChatFolderResolver.resolveFolderName(chatId),
      webhookUrl,
    };
  }
}
