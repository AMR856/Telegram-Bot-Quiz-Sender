import crypto from "crypto";
import { HTTPStatusText } from "../types/httpStatusText";
import CustomError from "./customError";

export default class BotTokenCipher {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly IV_SIZE_BYTES = 12;
  private static readonly ENCRYPTION_KEY_ENV = "BOT_TOKEN_ENCRYPTION_KEY";

  private static getEncryptionKey(): Buffer {
    // Getting the raw key from the environment variable and trimming it to remove any accidental whitespace.
    // This key is expected to be a string that will be hashed to produce a 32-byte key for AES-256.
    const rawKey = String(process.env[this.ENCRYPTION_KEY_ENV] || "").trim();

    if (!rawKey) {
      throw new CustomError(
        `${this.ENCRYPTION_KEY_ENV} is required for API mode.`,
        500,
        HTTPStatusText.ERROR,
      );
    }

    // Returning a SHA256 hash of the raw key to ensure it is 32 bytes long,
    // which is required for AES-256 encryption.
    return crypto.createHash("sha256").update(rawKey).digest();
  }

  public static encrypt(plainTextBotToken: string): string {
    const token = String(plainTextBotToken || "");
    // ! Why random IV?
    // Each encryption must use a different IV
    // Without it, same plaintext → same ciphertext (reveals patterns)
    // IV doesn't need to be secret, just random and unique per encryption
    const iv = crypto.randomBytes(this.IV_SIZE_BYTES);

    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      this.getEncryptionKey(),
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final(),
    ]);

    // ! What's an auth tag?
    // GCM mode produces a 16-byte authentication tag
    // Verifies that ciphertext wasn't tampered with
    // Prevents attackers from modifying encrypted data
    // Used during decryption to validate integrity
    const authTag = cipher.getAuthTag();

    // The final encrypted payload is a combination of the IV, authentication tag, and the encrypted token, all encoded in base64 and separated by colons.
    // Input:  "123456:abcdef-XXXXXX"
    // Output: "8xK2jR+9F/w=:rL5mK9pQ3xY=:92jK4n8xL2M9oR5sT7uV3w=="
    //            ↑ IV          ↑ AuthTag      ↑ Encrypted token
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  public static decrypt(encryptedPayload: string): string {
    const payload = String(encryptedPayload || "");
    // The encrypted payload is expected to be in the format of "IV:AuthTag:CipherText",
    // where each component is base64-encoded.
    // We split the payload by colons to extract these components for decryption.
    const [ivBase64, authTagBase64, cipherTextBase64] = payload.split(":");

    if (!ivBase64 || !authTagBase64 || !cipherTextBase64) {
      throw new CustomError(
        "Invalid encrypted bot token payload.",
        400,
        HTTPStatusText.FAIL,
      );
    }

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.getEncryptionKey(),
      Buffer.from(ivBase64, "base64"),
    );

    decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

    // * update() decrypts the ciphertext
    // * final() finishes decryption and verifies auth tag
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherTextBase64, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
