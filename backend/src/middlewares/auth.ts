import { UserStore } from "../modules/auth/auth.model";
import { HTTPStatusText } from "../types/httpStatusText";
import CustomError from "../utils/customError";


export const authMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key") || req.query.apiKey;

    if (!apiKey) {
      throw new CustomError("Missing API key", 401, HTTPStatusText.FAIL);
    }

    const user = await UserStore.getUserByApiKey(apiKey);

    if (!user) {
      throw new CustomError("Invalid API key", 401, HTTPStatusText.FAIL);
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof CustomError) {
      return next(error);
    }

    return next(
      new CustomError("Authentication check failed", 500, HTTPStatusText.ERROR),
    );
  }
};

