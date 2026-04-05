const HttpMessages = require("../core/httpStatusMessages");
const { CustomError } = require("../core/customError");
const { getUserByApiKey } = require("../stores/userStore");

const async authMiddleware(req, res, next){
  try {
    const apiKey = req.header("x-api-key") || req.query.apiKey;

    if (!apiKey) {
      throw new CustomError(401, "Missing API key", {
        statusText: HttpMessages.FAIL,
      });
    }

    const user = await getUserByApiKey(apiKey);

    if (!user) {
      throw new CustomError(401, "Invalid API key", {
        statusText: HttpMessages.FAIL,
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof CustomError) {
      return next(error);
    }

    return next(
      new CustomError(500, "Authentication check failed", {
        statusText: HttpMessages.ERROR,
        details: error.message,
      }),
    );
  }
};

module.exports = {
  authMiddleware,
};
