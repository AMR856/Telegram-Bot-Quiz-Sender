const { QuizzesService } = require("./quizzes.service");
const HttpStatusMessages = require("../../core/httpStatusMessages");

class QuizzesController {
  static async send(req, res, next) {
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
        status: HttpStatusMessages.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  QuizzesController,
};
