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

export class UserStore {
  private static readonly COLLECTION_NAME = "users";

  private static normalizeChatId(chatId: unknown): string {
    return String(chatId || "").trim();
  }

  private static normalizeBotToken(botToken: unknown): string {
    return String(botToken || "").trim();
  }

  private static getUsersCollection(): Collection<MongoUser> {
    const db: Db = MongoConnection.getDb();
    return db.collection(this.COLLECTION_NAME) as Collection<MongoUser>;
  }

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
      await this.getUsersCollection().createIndexes([
        { key: { chatId: 1 }, unique: true, name: "uniq_chat_id" },
        { key: { apiKey: 1 }, unique: true, name: "uniq_api_key" },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create indexes: ${errorMessage}`);
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
      const normalizedChatId = this.normalizeChatId(chatId);
      const normalizedBotToken = this.normalizeBotToken(botToken);
      const users = this.getUsersCollection();

      if (!normalizedChatId || !normalizedBotToken) {
        throw new Error("chatId and botToken are required");
      }

      const existing = await users.findOne({ chatId: normalizedChatId });
      const encryptedBotToken = BotTokenCipher.encrypt(normalizedBotToken);

      if (existing) {
        await users.updateOne(
          { _id: existing._id },
          {
            $set: {
              botTokenEncrypted: encryptedBotToken,
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

      const newUser: MongoUser = {
        id: crypto.randomUUID(),
        apiKey: crypto.randomBytes(24).toString("hex"),
        chatId: normalizedChatId,
        botTokenEncrypted: encryptedBotToken,
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
      throw new Error(`Failed to sign in or upsert user: ${errorMessage}`);
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

      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted),
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get user by API key: ${errorMessage}`);
    }
  }

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
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get user by ID: ${errorMessage}`);
    }
  }

  static async getUserByChatId(chatId: unknown): Promise<DecryptedUser | null> {
    try {
      const normalizedChatId = this.normalizeChatId(chatId);

      if (!normalizedChatId) {
        return null;
      }

      const user = await this.getUsersCollection().findOne({
        chatId: normalizedChatId,
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        apiKey: user.apiKey,
        chatId: user.chatId,
        botToken: BotTokenCipher.decrypt(user.botTokenEncrypted),
        isChannel: Boolean(user.isChannel),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get user by chat ID: ${errorMessage}`);
    }
  }
}
