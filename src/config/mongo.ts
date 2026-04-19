import { MongoClient, Db } from "mongodb";
import CustomError from "../utils/customError";
import { HTTPStatusText } from "../types/httpStatusText";
import { LoggerService } from "../utils/logger";

export class MongoConnection {
  private static instance: MongoClient | null = null;
  private static db: Db | null = null;
  private static readonly DEFAULT_DB_NAME: string = "telegram_quiz_bot";

  private static resolveDatabaseName(): string {
    // First check if there's an explicit database name in the environment variable
    const explicitName = String(process.env.MONGODB_DB_NAME || "").trim();
    if (explicitName) {
      return explicitName;
    }

    // If not, try to parse the database name from the URI path
    const mongoUri = String(process.env.MONGODB_URI || "");

    try {
      
      const parsed = new URL(mongoUri);
      // The database name is typically the first segment of the path in the URI
      const dbNameFromPath = parsed.pathname.replace(/^\//, "").trim();
      return dbNameFromPath || this.DEFAULT_DB_NAME;
    } catch (error) {
      return this.DEFAULT_DB_NAME;
    }
  }

  private static getMongoUri(): string {
    const uri = String(process.env.MONGODB_URI || "").trim();
    if (!uri) {
      throw new CustomError(
        "MONGODB_URI is required for API mode.",
        500,
        HTTPStatusText.ERROR,
      );
    }
    return uri;
  }

  public static async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }
    
    // Create a new MongoClient instance and connect to the database
    const mongoUri = this.getMongoUri();
    this.instance = new MongoClient(mongoUri);

    await this.instance.connect();
    this.db = this.instance.db(this.resolveDatabaseName());

    console.log(`Successfully connected to database: ${this.db.databaseName}`);
    return this.db;
  }

  public static getDb(): Db {
    if (!this.db) {
      throw new CustomError(
        "MongoDB is not connected. Call MongoConnection.connect() first.",
        500,
        HTTPStatusText.ERROR,
      );
    }
    return this.db;
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.db = null;
    }
  }

  public static isConnected(): boolean {
    return this.db !== null;
  }
}
