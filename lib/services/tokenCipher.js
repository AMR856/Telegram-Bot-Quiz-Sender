const crypto = require("crypto");

class BotTokenCipher {
  static #ALGORITHM = "aes-256-gcm";
  static #IV_SIZE_BYTES = 12;
  static #ENCRYPTION_KEY_ENV = "BOT_TOKEN_ENCRYPTION_KEY";

  static #getEncryptionKey() {
    const rawKey = String(process.env[this.#ENCRYPTION_KEY_ENV] || "").trim();

    if (!rawKey) {
      throw new Error(
        `${this.#ENCRYPTION_KEY_ENV} is required for API mode.`
      );
    }

    return crypto.createHash("sha256").update(rawKey).digest();
  }

  static encrypt(plainTextBotToken) {
    const token = String(plainTextBotToken || "");
    const iv = crypto.randomBytes(this.#IV_SIZE_BYTES);
    const cipher = crypto.createCipheriv(
      this.#ALGORITHM,
      this.#getEncryptionKey(),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  static decrypt(encryptedPayload) {
    const payload = String(encryptedPayload || "");
    const [ivBase64, authTagBase64, cipherTextBase64] = payload.split(":");

    if (!ivBase64 || !authTagBase64 || !cipherTextBase64) {
      throw new Error("Invalid encrypted bot token payload.");
    }

    const decipher = crypto.createDecipheriv(
      this.#ALGORITHM,
      this.#getEncryptionKey(),
      Buffer.from(ivBase64, "base64")
    );
    decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherTextBase64, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}

module.exports = BotTokenCipher;