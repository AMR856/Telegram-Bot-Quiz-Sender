const crypto = require("crypto");
const { getMongoDb } = require("../db/mongo");

const AUDIT_COLLECTION = "audit_logs";

const createApiKeyFingerprint = (apiKey) => {
  const normalized = String(apiKey || "").trim();
  if (!normalized) {
    return null;
  }

  return crypto.createHash("sha256").update(normalized).digest("hex");
};

const writeAuditLog = async ({
  method,
  path,
  statusCode,
  userId,
  chatId,
  ip,
  userAgent,
  apiKey,
}) => {
  const db = getMongoDb();

  await db.collection(AUDIT_COLLECTION).insertOne({
    method: String(method || "").toUpperCase(),
    path: String(path || ""),
    statusCode: Number(statusCode) || 0,
    userId: userId || null,
    chatId: chatId || null,
    apiKeyFingerprint: createApiKeyFingerprint(apiKey),
    ip: ip || null,
    userAgent: userAgent || null,
    createdAt: new Date(),
  });
};

module.exports = {
  writeAuditLog,
};
