const { AuditStore } = require("../stores/auditStore");
const { logger } = require("../logging/logger");

const auditLog = (req, res, next) => {
  res.on("finish", () => {
    AuditStore.writeAuditLog({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      userId: req.user?.id || null,
      chatId: req.user?.chatId || null,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      apiKey: req.header("x-api-key") || req.query.apiKey,
    }).catch((error) => {
      logger.error(`Failed to write audit log: ${error.message}`);
    });
  });

  return next();
};

module.exports = {
  auditLog,
};
