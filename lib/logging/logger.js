const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

class Logger {
  static #consoleLogger = null;
  static #fileLoggerCache = new Map();
  static #LOG_FORMAT = format.printf(({ timestamp, level, message }) => {
    const upperLevel = String(level || "info").toUpperCase();
    return `${timestamp} [${upperLevel}] ${message}`;
  });

  static #initializeConsoleLogger() {
    if (!this.#consoleLogger) {
      this.#consoleLogger = createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: format.combine(format.timestamp(), this.#LOG_FORMAT),
        transports: [
          new transports.Console({
            format: format.combine(
              format.colorize(),
              format.timestamp(),
              this.#LOG_FORMAT,
            ),
          }),
        ],
      });
    }
    return this.#consoleLogger;
  }

  static #ensureParentDirectory(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  static #createFileLogger(normalizedPath) {
    this.#ensureParentDirectory(normalizedPath);

    return createLogger({
      level: "info",
      format: format.combine(format.timestamp(), this.#LOG_FORMAT),
      transports: [
        new transports.File({
          filename: normalizedPath,
        }),
      ],
    });
  }

  static getConsoleLogger() {
    return this.#initializeConsoleLogger();
  }

  static getFileLogger(filePath) {
    const normalizedPath = path.resolve(filePath);

    if (this.#fileLoggerCache.has(normalizedPath)) {
      return this.#fileLoggerCache.get(normalizedPath);
    }

    const fileLogger = this.#createFileLogger(normalizedPath);
    this.#fileLoggerCache.set(normalizedPath, fileLogger);

    return fileLogger;
  }

  static log(message, level = "info") {
    this.getConsoleLogger().log({ level, message });
  }

  static info(message) {
    this.log(message, "info");
  }

  static warn(message) {
    this.log(message, "warn");
  }

  static error(message) {
    this.log(message, "error");
  }

  static debug(message) {
    this.log(message, "debug");
  }

  static logToFile(filePath, message, level = "info") {
    this.getFileLogger(filePath).log({ level, message });
  }

  static clearFileLoggerCache() {
    this.#fileLoggerCache.clear();
  }
}

const logger = Logger;
const logToFile = Logger.logToFile.bind(Logger);

module.exports = {
  Logger,
  logger,
  logToFile,
};
