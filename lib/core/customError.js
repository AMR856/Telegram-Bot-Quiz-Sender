const HttpStatusMessages = require("./httpStatusMessages");

class CustomError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message || "Internal Server Error");
    this.name = "CustomError";
    this.statusCode = statusCode || 500;
    this.statusText =
      options.statusText ||
      (this.statusCode >= 500
        ? HttpStatusMessages.ERROR
        : HttpStatusMessages.FAIL);
    this.details = options.details;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

module.exports = {
  CustomError
};
