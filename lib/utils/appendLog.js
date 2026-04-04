const fs = require("fs");

const appendLog = (filePath, logEntry) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${logEntry}\n`;
  return fs.promises.appendFile(filePath, logMessage, "utf8");
};

module.exports = { appendLog };