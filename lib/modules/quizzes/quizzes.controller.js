const { enqueueQuizzesForUser } = require("./quizzes.service");
const { validateSendQuizzesPayload } = require("./quizzes.validation");
const HttpMessages = require("../../types/statusMessages");
const { createHttpError } = require("../../utils/httpError");
const { sendSuccess } = require("../../utils/httpResponse");

const buildQuizzesController = ({ queue }) => ({
  sendQuizzes: async (req, res) => {
    const validation = validateSendQuizzesPayload(req.body || {});
    if (!validation.ok) {
      throw createHttpError(validation.status, validation.body.error, {
        statusText: HttpMessages.FAIL,
        details: validation.body.details,
      });
    }

    const { quizzes, delayMs = 2000 } = req.body || {};
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
