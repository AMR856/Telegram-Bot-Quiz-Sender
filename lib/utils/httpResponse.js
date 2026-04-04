const HttpMessages = require("../types/statusMessages");

const sendSuccess = (res, statusCode, payload = {}) =>
  res.status(statusCode).json({
    status: HttpMessages.SUCCESS,
    ...payload,
  });

module.exports = {
  sendSuccess,
};