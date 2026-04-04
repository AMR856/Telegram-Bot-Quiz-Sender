const { signInUser } = require("./auth.service");
const { validateAuthSignInPayload } = require("./auth.validation");
const HttpMessages = require("../../types/statusMessages");
const { createHttpError } = require("../../utils/httpError");
const { sendSuccess } = require("../../utils/httpResponse");

const signIn = async (req, res) => {
  const validation = validateAuthSignInPayload(req.body || {});
  if (!validation.ok) {
    throw createHttpError(validation.status, validation.body.error, {
      statusText: HttpMessages.FAIL,
      details: validation.body.details,
    });
  }

  const { chatId, botToken, isChannel = true } = req.body || {};
  const data = await signInUser({ chatId, botToken, isChannel });

  return sendSuccess(res, 200, data);
};

module.exports = {
  signIn,
};
