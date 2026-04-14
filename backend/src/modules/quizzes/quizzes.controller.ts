import { HTTPStatusText } from "../../types/httpStatusText";
import { QuizzesService } from "./quizzes.service";

export class QuizzesController {
  public static async send(req, res, next) {
    try {
      const queue = req.app.locals.queue;
      const { quizzes, delayMs } = res.locals.body || req.body;

      const data = await QuizzesService.enqueueQuizzesForUser({
        queue,
        user: req.user,
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
