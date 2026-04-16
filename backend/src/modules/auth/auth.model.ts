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
      // Checking the chat id is valid (Has the - and if it's a string)
      const normalizedChatId = this.normalizeChatId(chatId);
      const users = this.getUsersCollection();

      if (!normalizedChatId) {
        throw new CustomError("chatId is required", 400, HTTPStatusText.FAIL);
      }

      const existing = await users.findOne({ chatId: normalizedChatId });
      const encryptedBotToken = BotTokenCipher.encrypt(
        botToken as unknown as string,
      );

      if (existing) {
        // If the user already exists, it should update the bot token and the isChannel flag
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
        // After updating, it should return the updated user data with the decrypted bot token
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
      throw new CustomError(
        `Failed to get user by chat ID: ${errorMessage}`,
        400,
        HTTPStatusText.FAIL,
      );
    }
  }
}
