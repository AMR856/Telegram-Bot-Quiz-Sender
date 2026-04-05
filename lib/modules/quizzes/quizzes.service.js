const { SEND_QUIZZES_JOB_NAME } = require("./quizzes.job.service");

class QuizzesService {
  static async enqueueQuizzesForUser({ queue, user, quizzes, delayMs = 2000 }) {
    const job = await queue.add(SEND_QUIZZES_JOB_NAME, {
      user,
      quizzes,
      delayMs: Number(delayMs || 2000),
    });

    return {
      jobId: job.id,
      status: "queued",
      count: Array.isArray(quizzes) ? quizzes.length : 0,
    };
  }
}

module.exports = {
  QuizzesService,
};
