const crypto = require("crypto");
const { MongoConnection } = require("../config/mongo");
const BotTokenCipher = require("../services/tokenCipher");

class UserStore {
  static #COLLECTION_NAME = "users";

  static #normalizeChatId(chatId) {
    return String(chatId || "").trim();
  }

  static #normalizeBotToken(botToken) {
    return String(botToken || "").trim();
  }

  static #getUsersCollection() {
    return MongoConnection.getDb().collection(this.#COLLECTION_NAME);
  }

  static #publicUser(user) {
    return {
      id: user.id,
      chatId: user.chatId,
      isChannel: user.isChannel,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static async #ensureIndexes() {
    await this.#getUsersCollection().createIndexes([
      { key: { chatId: 1 }, unique: true, name: "uniq_chat_id" },
      { key: { apiKey: 1 }, unique: true, name: "uniq_api_key" },
    ]);
  }

  static async signInOrUpsert({ chatId, botToken, isChannel = true }) {
    await this.#ensureIndexes();

    const now = new Date().toISOString();
    const normalizedChatId = this.#normalizeChatId(chatId);
    const normalizedBotToken = this.#normalizeBotToken(botToken);
    const users = this.#getUsersCollection();

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
        user: this.#publicUser({
          ...existing,
          isChannel: Boolean(isChannel),
          updatedAt: now,
        }),
        apiKey: existing.apiKey,
      };
    }

    const user = {
      id: crypto.randomUUID(),
      apiKey: crypto.randomBytes(24).toString("hex"),
      chatId: normalizedChatId,
      botTokenEncrypted: encryptedBotToken,
      isChannel: Boolean(isChannel),
      createdAt: now,
      updatedAt: now,
    };

    await users.insertOne(user);

    return {
      user: this.#publicUser(user),
      apiKey: user.apiKey,
    };
  }

  static async getUserByApiKey(apiKey) {
    const user = await this.#getUsersCollection().findOne({
      apiKey: String(apiKey || ""),
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
  }

  static async getUserById(userId) {
    const user = await this.#getUsersCollection().findOne({
      id: String(userId || ""),
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
  }

  static async getUserByChatId(chatId) {
    const normalizedChatId = this.#normalizeChatId(chatId);
    const user = await this.#getUsersCollection().findOne({
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
  }
}

module.exports = { UserStore };
