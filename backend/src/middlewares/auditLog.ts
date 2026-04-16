import { Request, Response, NextFunction } from "express";
import { LoggerService } from "../utils/logger";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    chatId: string;
  };
  startTime?: number;
}

export const auditLog = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  req.startTime = Date.now();

  res.on("finish", async () => {
    try {
      const duration = Date.now() - (req.startTime || 0);
      const apiKey = req.header("x-api-key") || req.query.apiKey;
      const method = req.method;
      const path = req.originalUrl;
      const statusCode = res.statusCode;
      const userId = req.user?.id ?? null;
      const chatId = req.user?.chatId ?? null;
      const ip = req.ip ?? null;

      const requestSummary = `[HTTP] ${method} ${path} -> ${statusCode} (${duration}ms) ip=${ip || "-"} userId=${userId || "anonymous"} chatId=${chatId || "-"}`;

      // Logging in files not only auditing in the database,
      // we log all requests with their status codes and other relevant information.
      if (statusCode >= 500) {
        LoggerService.error(requestSummary);
      } else if (statusCode >= 400) {
        LoggerService.warn(requestSummary);
      } else {
        LoggerService.info(requestSummary);
      }

      // ! Don't audit the response if it has a status code of 304 (Not Modified) to avoid logging cache hits
      if (statusCode !== 304) {
        await LoggerService.writeAuditLog({
          method,
          path,
          statusCode,
          userId,
          chatId,
          ip,
          userAgent: req.get("user-agent") ?? null,
          apiKey: typeof apiKey === "string" ? apiKey : null,
          duration,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      LoggerService.error(
        `Failed to write audit log in middleware: ${errorMessage}`,
      );
    }
  });

  next();
};
