const { enqueueQuizzesForUser } = require("./quizzes.service");
const { sendQuizzesBodySchema } = require("./quizzes.validation");
const { sendSuccess } = require("../../utils/httpResponse");

const buildQuizzesController = ({ queue }) => ({
  sendQuizzes: async (req, res) => {
    const { quizzes, delayMs } = sendQuizzesBodySchema.parse(req.body || {});
    const data = await enqueueQuizzesForUser({
      queue,
      user: req.user,
      quizzes,
      delayMs,
    });

    return sendSuccess(res, 202, data);
  },
});

module.exports = {
  buildQuizzesController,
};
