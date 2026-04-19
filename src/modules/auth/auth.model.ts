import crypto from "crypto";
import { Collection, Db } from "mongodb";
import { MongoConnection } from "../../config/mongo";
import BotTokenCipher from "../../utils/tokenCipher";
import {
  DecryptedUser,
  MongoUser,
  PublicUser,
  SignInResponse,
  UserSignInOrUpsertParams,
} from "./auth.type";
import CustomError from "../../utils/customError";
import { HTTPStatusText } from "../../types/httpStatusText";

export class UserModel {
  private static readonly COLLECTION_NAME = "users";

  private static normalizeBotToken(botToken: unknown): string {
    return String(botToken || "").trim();
  }

  private static getBotTokenFingerprint(botToken: string): string {
    return crypto.createHash("sha256").update(botToken).digest("hex");
  }

  private static normalizeChatId(chatId: unknown): string {
    // The chatID should contain a - if it doesn't contain it, it should add it
    const normalizedChatId = String(chatId || "").trim();
    if (normalizedChatId && !normalizedChatId.includes("-")) {
      return `-${normalizedChatId}`;
    }
    return normalizedChatId;
  }

  private static getUsersCollection(): Collection<MongoUser> {
    const db: Db = MongoConnection.getDb();
    return db.collection(this.COLLECTION_NAME) as Collection<MongoUser>;
  }

  // This function is used to return only the public information of the user, without the bot token and the API key
  private static publicUser(user: Partial<MongoUser>): PublicUser {
    return {
      id: user.id || "",
      chatId: user.chatId || "",
      isChannel: Boolean(user.isChannel),
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    };
  }

  private static async ensureIndexes(): Promise<void> {
    try {
      const users = this.getUsersCollection();
      // Enforce uniqueness per (chatId + bot token) so one chat can own multiple bots.
      await users.createIndexes([
        {
          key: { chatId: 1, botTokenFingerprint: 1 },
          unique: true,
          name: "uniq_chat_bot_fingerprint",
        },
        { key: { chatId: 1 }, name: "chat_id_idx" },
        { key: { apiKey: 1 }, unique: true, name: "uniq_api_key" },
        { key: { id: 1 }, unique: true, name: "uniq_user_id" },
        { key: { id: 1, webhookSecret: 1 }, name: "user_webhook_idx" },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to create indexes: ${errorMessage}`,
        500,
        HTTPStatusText.ERROR,
      );
    }
  }

  static async signInOrUpsert({
    chatId,
    botToken,
    isChannel = true,
  }: UserSignInOrUpsertParams): Promise<SignInResponse> {
    try {
      await this.ensureIndexes();

      const now = new Date().toISOString();
      // Checking the chat id is valid (Has the - and if it's a string)
      const normalizedChatId = this.normalizeChatId(chatId);
      const normalizedBotToken = this.normalizeBotToken(botToken);
      const users = this.getUsersCollection();

      if (!normalizedChatId) {
        throw new CustomError("chatId is required", 400, HTTPStatusText.FAIL);
      }

      if (!normalizedBotToken) {
        throw new CustomError("botToken is required", 400, HTTPStatusText.FAIL);
      }

      const botTokenFingerprint = this.getBotTokenFingerprint(normalizedBotToken);
      const encryptedBotToken = BotTokenCipher.encrypt(normalizedBotToken);

      const existing = await users.findOne({
        chatId: normalizedChatId,
        botTokenFingerprint,
      });

      if (existing) {
        await users.updateOne(
          { _id: existing._id },
          {
            $set: {
              botTokenEncrypted: encryptedBotToken,
              botTokenFingerprint,
              webhookSecret: existing.webhookSecret,
              isChannel: Boolean(isChannel),
              updatedAt: now,
            },
          },
        );

        return {
          user: this.publicUser({
            ...existing,
            isChannel: Boolean(isChannel),
            updatedAt: now,
          }),
          apiKey: existing.apiKey,
        };
      }

      // Creating new user because it didn't exist before
      const newUser: MongoUser = {
        id: crypto.randomUUID(),
        apiKey: crypto.randomBytes(24).toString("hex"),
        chatId: normalizedChatId,
        botTokenEncrypted: encryptedBotToken,
        botTokenFingerprint,
        webhookSecret: crypto.randomBytes(24).toString("hex"),
        isChannel: Boolean(isChannel),
        createdAt: now,
        updatedAt: now,
      };

      await users.insertOne(newUser);

      return {
        user: this.publicUser(newUser),
        apiKey: newUser.apiKey,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to sign in or upsert user: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }

  static async getUserByApiKey(apiKey: unknown): Promise<DecryptedUser | null> {
    try {
      const normalizedApiKey = String(apiKey || "").trim();

      if (!normalizedApiKey) {
        return null;
      }

      const user = await this.getUsersCollection().findOne({
        apiKey: normalizedApiKey,
      });

      if (!user) {
        return null;
      }

      // Decrypting the bot token before returning the user data
      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted), // decrypted bot token should be returned
        webhookSecret: user.webhookSecret,
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to get user by API key: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }

  // * Same logic as the function above it only differs by the search key
  static async getUserById(userId: unknown): Promise<DecryptedUser | null> {
    try {
      const normalizedUserId = String(userId || "").trim();

      if (!normalizedUserId) {
        return null;
      }

      const user = await this.getUsersCollection().findOne({
        id: normalizedUserId,
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted),
        webhookSecret: user.webhookSecret,
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to get user by ID: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }

  // * Same logic as the two functions above it only differs by the search key
  static async getUserByChatId(chatId: unknown): Promise<DecryptedUser | null> {
    try {
      const normalizedChatId = this.normalizeChatId(chatId);

      if (!normalizedChatId) {
        return null;
      }

      const user = await this.getUsersCollection().findOne(
        {
          chatId: normalizedChatId,
        },
        {
          // Multiple bots can now exist for one chat; return the latest updated one.
          sort: { updatedAt: -1 },
        },
      );

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted),
        webhookSecret: user.webhookSecret,
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to get user by chat ID: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }

  static async getUserByWebhook(
    userId: unknown,
    webhookSecret: unknown,
  ): Promise<DecryptedUser | null> {
    try {
      const normalizedUserId = String(userId || "").trim();
      const normalizedWebhookSecret = String(webhookSecret || "").trim();

      if (!normalizedUserId || !normalizedWebhookSecret) {
        return null;
      }

      const user = await this.getUsersCollection().findOne({
        id: normalizedUserId,
        webhookSecret: normalizedWebhookSecret,
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted),
        webhookSecret: user.webhookSecret,
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to get user by webhook credentials: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }
}
