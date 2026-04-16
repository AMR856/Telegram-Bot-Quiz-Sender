import { Request, Response, NextFunction } from "express";
import { HTTPStatusText } from "../../types/httpStatusText";
import { QuizzesService } from "./quizzes.service";

export class QuizzesController {
  public static async send(req: Request, res: Response, next: NextFunction) {
    try {
      const queue = req.app.locals.queue;
      const user = res.locals.user;
      const { quizzes, delayMs } = res.locals.body || req.body;

      const data = await QuizzesService.enqueueQuizzesForUser({
        queue,
        user,
        quizzes,
        delayMs,
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
