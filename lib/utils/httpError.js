const HttpMessages = require("../types/statusMessages");

class HttpError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message || "Internal Server Error");
    this.name = "HttpError";
    this.statusCode = statusCode || 500;
    this.statusText =
      options.statusText ||
      (this.statusCode >= 500 ? HttpMessages.ERROR : HttpMessages.FAIL);
    this.details = options.details;
  }
}

const createHttpError = (statusCode, message, options = {}) =>
  new HttpError(statusCode, message, options);

module.exports = {
  HttpError,
  createHttpError,
};