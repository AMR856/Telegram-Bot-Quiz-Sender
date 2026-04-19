import { Request, Response, NextFunction } from "express";
import { HTTPStatusText } from "../../types/httpStatusText";
import { QuizzesService } from "./quizzes.service";

export class QuizzesController {
  public static async send(req: Request, res: Response, next: NextFunction) {
    try {
      // Getting the queue that was initizlized in the beginning of the server and attached to app.locals for access in controllers and route handlers
      const queue = req.app.locals.queue;
      const user = res.locals.user;
      const { quizzes, delayMs, retryWrongAfterMinutes } =
        res.locals.body || req.body;

      const data = await QuizzesService.enqueueQuizzesForUser({
        queue,
        user,
        quizzes,
        delayMs,
        retryWrongAfterMinutes,
      });

      res.status(202).json({
        status: HTTPStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}
