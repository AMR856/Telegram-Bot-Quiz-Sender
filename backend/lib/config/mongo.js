const { MongoClient } = require("mongodb");

class MongoConnection {
  static #instance = null;
  static #client = null;
  static #db = null;
  static #DEFAULT_DB_NAME = "telegram_quiz_bot";

  static #resolveDatabaseName() {
    const explicitName = String(process.env.MONGODB_DB_NAME || "").trim();
    if (explicitName) {
      return explicitName;
    }

    const mongoUri = String(process.env.MONGODB_URI || "");

    try {
      const parsed = new URL(mongoUri);
      const dbNameFromPath = parsed.pathname.replace(/^\//, "").trim();
      return dbNameFromPath || this.#DEFAULT_DB_NAME;
    } catch (error) {
      return this.#DEFAULT_DB_NAME;
    }
  }

  static #getMongoUri() {
    const uri = String(process.env.MONGODB_URI || "").trim();
    if (!uri) {
      throw new Error("MONGODB_URI is required for API mode.");
    }
    return uri;
  }

  static async connect() {
    if (this.#db) {
      return this.#db;
    }

    const mongoUri = this.#getMongoUri();
    this.#client = new MongoClient(mongoUri);

    await this.#client.connect();
    this.#db = this.#client.db(this.#resolveDatabaseName());

    return this.#db;
  }

  static getDb() {
    if (!this.#db) {
      throw new Error(
        "MongoDB is not connected. Call MongoConnection.connect() first.",
      );
    }
    return this.#db;
  }

  static async disconnect() {
    if (this.#client) {
      await this.#client.close();
      this.#client = null;
      this.#db = null;
    }
  }

  static isConnected() {
    return this.#db !== null;
  }
}

module.exports = { MongoConnection };
