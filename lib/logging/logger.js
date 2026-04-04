const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

const fileLoggerCache = new Map();

const logFormat = format.printf(({ timestamp, level, message }) => {
  const upperLevel = String(level || "info").toUpperCase();
  return `${timestamp} [${upperLevel}] ${message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), logFormat),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        logFormat,
      ),
    }),
  ],
});

const ensureParentDirectory = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const getFileLogger = (filePath) => {
  const normalizedPath = path.resolve(filePath);

  if (fileLoggerCache.has(normalizedPath)) {
    return fileLoggerCache.get(normalizedPath);
  }

  ensureParentDirectory(normalizedPath);

  const fileLogger = createLogger({
    level: "info",
    format: format.combine(format.timestamp(), logFormat),
    transports: [
      new transports.File({
        filename: normalizedPath,
      }),
    ],
  });

  fileLoggerCache.set(normalizedPath, fileLogger);
  return fileLogger;
};

const logToFile = async (filePath, message, level = "info") => {
  getFileLogger(filePath).log({ level, message });
};

module.exports = {
  logger,
  getFileLogger,
  logToFile,
};