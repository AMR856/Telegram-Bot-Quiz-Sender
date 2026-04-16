import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
} from "winston";
import { Collection, Db } from "mongodb";
import { MongoConnection } from "../config/mongo";
import CustomError from "./customError";
import { HTTPStatusText } from "../types/httpStatusText";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface AuditLogData {
  method: string;
  path: string;
  statusCode: number;
  userId: string | null;
  chatId: string | null;
  ip: string | null;
  userAgent: string | null;
  apiKey: string | null;
  duration: number;
  timestamp: Date;
}

interface MongoAuditLog extends AuditLogData {
  apiKeyFingerprint: string | null;
  createdAt: Date;
}

/**
 * Unified Logger Service
 * Handles:
 * - Console logging with color formatting
 * - File-based logging with rotation
 * - Audit logging to MongoDB
 */
export class LoggerService {
  // Singleton instances for console and file loggers, 
  // and a cache for file loggers to avoid creating multiple loggers for the same file path.
  private static consoleLogger: WinstonLogger | null = null;
  private static fileLoggerCache = new Map<string, WinstonLogger>();
  private static readonly AUDIT_COLLECTION = "audit_logs";
  private static readonly DEFAULT_LOG_DIR = "logs";
  private static readonly DEFAULT_APP_LOG_FILE = "app.log";
  private static readonly DEFAULT_ERROR_LOG_FILE = "error.log";

  // Custom log format to include timestamp, log level, and message in a consistent format for both console and file logging.
  private static readonly LOG_FORMAT = format.printf((info: any) => {
    const { timestamp, level, message } = info as LogEntry;
    const upperLevel = (level || "info").toUpperCase();
    return `${timestamp} [${upperLevel}] ${message}`;
  });

  private static getAuditCollection(): Collection<MongoAuditLog> {
    const db: Db = MongoConnection.getDb();
    return db.collection(this.AUDIT_COLLECTION) as Collection<MongoAuditLog>;
  }

  private static getDefaultLogFilePath(): string {
    const configuredPath = String(process.env.LOG_FILE || "").trim();
    if (configuredPath) {
      return path.resolve(configuredPath);
    }

    return path.resolve(
      process.cwd(),
      this.DEFAULT_LOG_DIR,
      this.DEFAULT_APP_LOG_FILE,
    );
  }

  private static getDefaultErrorLogFilePath(): string {
    const configuredPath = String(process.env.ERROR_LOG_FILE || "").trim();
    if (configuredPath) {
      return path.resolve(configuredPath);
    }

    return path.resolve(
      process.cwd(),
      this.DEFAULT_LOG_DIR,
      this.DEFAULT_ERROR_LOG_FILE,
    );
  }

  /**
   * Create SHA256 fingerprint of API key for audit logging (non-reversible)
   */
  private static createApiKeyFingerprint(apiKey: unknown): string | null {
    const normalized = String(apiKey || "").trim();
    if (!normalized) {
      return null;
    }

    // Use SHA256 hash to create a fingerprint of the API key. 
    // This allows us to log and query by API key without storing the actual key, enhancing security.
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Ensure MongoDB indexes exist
   */
  private static async ensureAuditIndexes(): Promise<void> {
    try {
      // Create indexes on the audit_logs collection to optimize query performance and enable automatic expiration of logs after 30 days.
      await this.getAuditCollection().createIndexes([
        { key: { createdAt: 1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
        { key: { userId: 1 } },
        { key: { chatId: 1 } },
        { key: { apiKeyFingerprint: 1 } },
        { key: { method: 1, path: 1 } },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(`Failed to create audit indexes: ${errorMessage}`, 500, HTTPStatusText.ERROR);
    }
  }

  /**
   * Console & File Logging
   */

  private static initializeConsoleLogger(): WinstonLogger {
    // Initialize the console logger if it hasn't been created yet. 
    // The console logger is configured with a colorized format for better readability in the terminal.
    if (!this.consoleLogger) {
      const defaultLogFilePath = this.getDefaultLogFilePath();
      const defaultErrorLogFilePath = this.getDefaultErrorLogFilePath();

      this.ensureParentDirectory(defaultLogFilePath);
      this.ensureParentDirectory(defaultErrorLogFilePath);

      this.consoleLogger = createLogger({
        level: process.env.LOG_LEVEL || "info",
        // The log format includes a timestamp and the log level in uppercase, followed by the log message. 
        // This format is applied to both console and file loggers for consistency.
        format: format.combine(format.timestamp(), this.LOG_FORMAT),
        transports: [
          new transports.Console({
            format: format.combine(
              format.colorize(),
              format.timestamp(),
              this.LOG_FORMAT,
            ),
          }),
          new transports.File({
            filename: defaultLogFilePath,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: defaultErrorLogFilePath,
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ],
        exceptionHandlers: [
          new transports.File({ filename: `${defaultErrorLogFilePath}.exceptions` }),
        ],
        rejectionHandlers: [
          new transports.File({ filename: `${defaultErrorLogFilePath}.rejections` }),
        ],
      });
    }
    return this.consoleLogger;
  }

  private static ensureParentDirectory(filePath: string): void {
    try {
      // Ensure the parent directory of the log file exists. If it doesn't exist, create it recursively. 
      // This is important to prevent errors when the logger tries to write to a file in a non-existent directory.
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to create log directory: ${errorMessage}`);
      throw error;
    }
  }

  private static createFileLogger(normalizedPath: string): WinstonLogger {
    this.ensureParentDirectory(normalizedPath);

    return createLogger({
      level: "info",
      format: format.combine(format.timestamp(), this.LOG_FORMAT),
      transports: [
        new transports.File({
          filename: normalizedPath,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
      // The exceptionHandlers configuration ensures that any uncaught exceptions are 
      // also logged to a separate file with the same base name but with a .exceptions extension. 
      // This allows for easier debugging of unexpected errors.
      exceptionHandlers: [
        new transports.File({ filename: `${normalizedPath}.exceptions` }),
      ],
    });
  }

  static getConsoleLogger(): WinstonLogger {
    return this.initializeConsoleLogger();
  }

  static getFileLogger(filePath: string): WinstonLogger {
    const normalizedPath = path.resolve(filePath);

    // Check if a logger for the given file path already exists in the cache. 
    // If it does, return the cached logger to avoid creating multiple loggers for the same file.
    const cached = this.fileLoggerCache.get(normalizedPath);
    if (cached) {
      return cached;
    }

    // If no cached logger exists, create a new file logger for the specified path, 
    // store it in the cache, and return it.
    const fileLogger = this.createFileLogger(normalizedPath);
    this.fileLoggerCache.set(normalizedPath, fileLogger);

    return fileLogger;
  }

  static log(message: string, level: LogLevel = "info"): void {
    this.getConsoleLogger().log(level, message);
  }

  static info(message: string): void {
    this.log(message, "info");
  }

  static warn(message: string): void {
    this.log(message, "warn");
  }

  static error(message: string | Error): void {
    const errorMessage = message instanceof Error ? message.message : message;
    this.log(errorMessage, "error");
  }

  static debug(message: string): void {
    this.log(message, "debug");
  }

  static logToFile(
    filePath: string | undefined,
    message: string,
    level: LogLevel = "info",
  ): void {
    const normalizedPath = String(filePath || "").trim();
    const targetFilePath = normalizedPath || this.getDefaultLogFilePath();
    this.getFileLogger(targetFilePath).log(level, message);
  }

  /**
   * Write audit log to MongoDB
   * Used for tracking API requests, authentication, access patterns
   */
  static async writeAuditLog(auditData: AuditLogData): Promise<void> {
    try {
      await this.ensureAuditIndexes();

      // Create a MongoDB document for the audit log entry, including a fingerprint of the API key for security.
      const mongoAuditLog: MongoAuditLog = {
        ...auditData,
        apiKeyFingerprint: this.createApiKeyFingerprint(auditData.apiKey),
        createdAt: new Date(),
      };

      await this.getAuditCollection().insertOne(mongoAuditLog);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.error(
        `Failed to write audit log: ${errorMessage}. Data: ${JSON.stringify(auditData)}`,
      );
    }
  }

  /**
   * Query audit logs by user
   */
  static async getAuditLogsByUserId(
    userId: string,
    limit: number = 100,
  ): Promise<MongoAuditLog[]> {
    try {
      // Query the audit_logs collection for entries matching the specified userId, sorted by creation date in descending order, and limited to the specified number of results.
      return await this.getAuditCollection()
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(
        `Failed to query audit logs for user ${userId}: ${errorMessage}`,
        500,
        HTTPStatusText.ERROR
      );
    }
  }

  /**
   * Query audit logs by API key fingerprint
   */
  static async getAuditLogsByApiKey(
    apiKey: unknown,
    limit: number = 100,
  ): Promise<MongoAuditLog[]> {
    try {
      // Create a fingerprint of the provided API key and query the audit_logs collection for entries matching that fingerprint, 
      // sorted by creation date in descending order, and limited to the specified number of results.
      const fingerprint = this.createApiKeyFingerprint(apiKey);
      if (!fingerprint) {
        return [];
      }

      return await this.getAuditCollection()
        .find({ apiKeyFingerprint: fingerprint })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new CustomError(`Failed to query audit logs by API key: ${errorMessage}`, 500, HTTPStatusText.ERROR);
    } 
  }

  /**
   * Cleanup & Lifecycle
   */

  static clearFileLoggerCache(): void {
    this.fileLoggerCache.clear();
  }

  static async closeAllLoggers(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.consoleLogger) {
        this.consoleLogger.close();
      }

      const closePromises = Array.from(this.fileLoggerCache.values()).map(
        (logger) =>
          new Promise<void>((res) => {
            logger.close();
            res();
          }),
      );

      Promise.all(closePromises)
        .then(() => {
          this.fileLoggerCache.clear();
          resolve();
        })
        .catch(reject);
    });
  }
}

/**
 * Export convenience aliases for backward compatibility
 */
export const logger = LoggerService;
export const logToFile = LoggerService.logToFile.bind(LoggerService);
export const writeAuditLog = LoggerService.writeAuditLog.bind(LoggerService);
