const crypto = require("crypto");
const { MongoConnection } = require("../config/mongo");

const AUDIT_COLLECTION = "audit_logs";

class AuditStore {
  static createApiKeyFingerprint(apiKey) {
    const normalized = String(apiKey || "").trim();
    if (!normalized) {
      return null;
    }

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  static async writeAuditLog({
    method,
    path,
    statusCode,
    userId,
    chatId,
    ip,
    userAgent,
    apiKey,
  }) {
    const db = MongoConnection.getDb();

    await db.collection(AUDIT_COLLECTION).insertOne({
      method: String(method || "").toUpperCase(),
      path: String(path || ""),
      statusCode: Number(statusCode) || 0,
      userId: userId || null,
      chatId: chatId || null,
      apiKeyFingerprint: this.createApiKeyFingerprint(apiKey),
      ip: ip || null,
      userAgent: userAgent || null,
      createdAt: new Date(),
    });
  }
}

module.exports = {
  AuditStore,
};
