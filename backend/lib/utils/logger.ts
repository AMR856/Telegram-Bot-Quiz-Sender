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
  private static consoleLogger: WinstonLogger | null = null;
  private static fileLoggerCache = new Map<string, WinstonLogger>();
  private static readonly AUDIT_COLLECTION = "audit_logs";

  private static readonly LOG_FORMAT = format.printf((info: any) => {
    const { timestamp, level, message } = info as LogEntry;
    const upperLevel = (level || "info").toUpperCase();
    return `${timestamp} [${upperLevel}] ${message}`;
  });


  private static getAuditCollection(): Collection<MongoAuditLog> {
    const db: Db = MongoConnection.getDb();
    return db.collection(
      this.AUDIT_COLLECTION
    ) as Collection<MongoAuditLog>;
  }

  /**
   * Create SHA256 fingerprint of API key for audit logging (non-reversible)
   */
  private static createApiKeyFingerprint(apiKey: unknown): string | null {
    const normalized = String(apiKey || "").trim();
    if (!normalized) {
      return null;
    }

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Ensure MongoDB indexes exist
   */
  private static async ensureAuditIndexes(): Promise<void> {
    try {
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
      throw new Error(`Failed to create audit indexes: ${errorMessage}`);
    }
  }

  /**
   * Console & File Logging
   */

  private static initializeConsoleLogger(): WinstonLogger {
    if (!this.consoleLogger) {
      this.consoleLogger = createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: format.combine(format.timestamp(), this.LOG_FORMAT),
        transports: [
          new transports.Console({
            format: format.combine(
              format.colorize(),
              format.timestamp(),
              this.LOG_FORMAT
            ),
          }),
        ],
      });
    }
    return this.consoleLogger;
  }

  private static ensureParentDirectory(filePath: string): void {
    try {
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

    const cached = this.fileLoggerCache.get(normalizedPath);
    if (cached) {
      return cached;
    }

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
    const errorMessage =
      message instanceof Error ? message.message : message;
    this.log(errorMessage, "error");
  }

  static debug(message: string): void {
    this.log(message, "debug");
  }

  static logToFile(
    filePath: string,
    message: string,
    level: LogLevel = "info"
  ): void {
    this.getFileLogger(filePath).log(level, message);
  }


  /**
   * Write audit log to MongoDB
   * Used for tracking API requests, authentication, access patterns
   */
  static async writeAuditLog(auditData: AuditLogData): Promise<void> {
    try {
      await this.ensureAuditIndexes();

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
        `Failed to write audit log: ${errorMessage}. Data: ${JSON.stringify(auditData)}`
      );
    }
  }

  /**
   * Query audit logs by user
   */
  static async getAuditLogsByUserId(
    userId: string,
    limit: number = 100
  ): Promise<MongoAuditLog[]> {
    try {
      return await this.getAuditCollection()
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `Failed to query audit logs for user ${userId}: ${errorMessage}`
      );
    }
  }

  /**
   * Query audit logs by API key fingerprint
   */
  static async getAuditLogsByApiKey(
    apiKey: unknown,
    limit: number = 100
  ): Promise<MongoAuditLog[]> {
    try {
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
      throw new Error(`Failed to query audit logs by API key: ${errorMessage}`);
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
          })
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
export const writeAuditLog =
  LoggerService.writeAuditLog.bind(LoggerService);