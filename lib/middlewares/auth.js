const HttpMessages = require("../types/statusMessages");
const { createHttpError } = require("../utils/httpError");
const { getUserByApiKey } = require("../utils/userStore");

const authMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key") || req.query.apiKey;

    if (!apiKey) {
      return next(
        createHttpError(401, "Missing API key", {
          statusText: HttpMessages.FAIL,
        }),
      );
    }

    const user = await getUserByApiKey(apiKey);

    if (!user) {
      return next(
        createHttpError(401, "Invalid API key", {
          statusText: HttpMessages.FAIL,
        }),
      );
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(
      createHttpError(500, "Authentication check failed", {
        statusText: HttpMessages.ERROR,
        details: error.message,
      }),
    );
  }
};

module.exports = {
  authMiddleware,
};
