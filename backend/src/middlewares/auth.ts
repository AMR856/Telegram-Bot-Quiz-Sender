import { Request, Response, NextFunction } from "express";
import { UserModel } from "../modules/auth/auth.model";
import { HTTPStatusText } from "../types/httpStatusText";
import CustomError from "../utils/customError";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = req.header("x-api-key") || req.query.apiKey; // Support API key in both header and query parameters

    if (!apiKey) {
      throw new CustomError("Missing API key", 401, HTTPStatusText.FAIL);
    }

    const user = await UserModel.getUserByApiKey(apiKey);

    if (!user) {
      throw new CustomError("Invalid API key", 401, HTTPStatusText.FAIL);
    }

    res.locals.user = user;
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
