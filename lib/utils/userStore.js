const crypto = require("crypto");
const { getMongoDb } = require("../db/mongo");
const { encryptBotToken, decryptBotToken } = require("./botTokenCipher");

const USERS_COLLECTION = "users";

const normalizeChatId = (chatId) => String(chatId || "").trim();
const normalizeBotToken = (botToken) => String(botToken || "").trim();

const getUsersCollection = () => getMongoDb().collection(USERS_COLLECTION);

const publicUser = (user) => ({
  id: user.id,
  chatId: user.chatId,
  isChannel: user.isChannel,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureUserIndexes = async () => {
  await getUsersCollection().createIndexes([
    { key: { chatId: 1 }, unique: true, name: "uniq_chat_id" },
    { key: { apiKey: 1 }, unique: true, name: "uniq_api_key" },
  ]);
};

const signInOrUpsertUser = async ({ chatId, botToken, isChannel = true }) => {
  await ensureUserIndexes();

  const now = new Date().toISOString();
  const normalizedChatId = normalizeChatId(chatId);
  const normalizedBotToken = normalizeBotToken(botToken);
  const users = getUsersCollection();

  const existing = await users.findOne({ chatId: normalizedChatId });
  const encryptedBotToken = encryptBotToken(normalizedBotToken);

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
      user: publicUser({ ...existing, isChannel: Boolean(isChannel), updatedAt: now }),
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
    user: publicUser(user),
    apiKey: user.apiKey,
  };
};

const getUserByApiKey = async (apiKey) => {
  const user = await getUsersCollection().findOne({ apiKey: String(apiKey || "") });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    apiKey: user.apiKey,
    chatId: user.chatId,
    botToken: decryptBotToken(user.botTokenEncrypted),
    isChannel: Boolean(user.isChannel),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  signInOrUpsertUser,
  getUserByApiKey,
};
