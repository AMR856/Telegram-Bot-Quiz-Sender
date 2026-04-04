const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_SIZE_BYTES = 12;

const getEncryptionKey = () => {
  const rawKey = String(process.env.BOT_TOKEN_ENCRYPTION_KEY || "").trim();

  if (!rawKey) {
    throw new Error("BOT_TOKEN_ENCRYPTION_KEY is required for API mode.");
  }

  // Always derive a 32-byte key from env input for stable AES-256 usage.
  return crypto.createHash("sha256").update(rawKey).digest();
};

const encryptBotToken = (plainTextBotToken) => {
  const token = String(plainTextBotToken || "");
  const iv = crypto.randomBytes(IV_SIZE_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
};

const decryptBotToken = (encryptedPayload) => {
  const payload = String(encryptedPayload || "");
  const [ivBase64, authTagBase64, cipherTextBase64] = payload.split(":");

  if (!ivBase64 || !authTagBase64 || !cipherTextBase64) {
    throw new Error("Invalid encrypted bot token payload.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

module.exports = {
  encryptBotToken,
  decryptBotToken,
};
