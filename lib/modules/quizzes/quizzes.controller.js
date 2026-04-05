const { enqueueQuizzesForUser } = require("./quizzes.service");

class QuizzController {
  static async send(req, res, next) {
    try {
      const data = await enqueueQuizzesForUser({
        queue,
        user: req.user,
        quizzes,
        delayMs,
      });

      res.status(202).json({
        status: HttpStatusText.SUCCESS,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  QuizzController,
};
