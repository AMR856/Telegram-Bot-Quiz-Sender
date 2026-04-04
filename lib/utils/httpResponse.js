const HttpMessages = require("../models/httpStatusMessages");

const sendSuccess = (res, statusCode, payload = {}) =>
  res.status(statusCode).json({
    status: HttpMessages.SUCCESS,
    ...payload,
  });

module.exports = {
  sendSuccess,
};
