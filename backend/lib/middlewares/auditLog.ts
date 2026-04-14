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

      await LoggerService.writeAuditLog({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        userId: req.user?.id ?? null,
        chatId: req.user?.chatId ?? null,
        ip: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        apiKey: typeof apiKey === "string" ? apiKey : null,
        duration,
        timestamp: new Date(),
      });
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
