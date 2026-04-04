const { enqueueSendQuizzesJob } = require("./quizzes.job.service");

const enqueueQuizzesForUser = async ({ queue, user, quizzes, delayMs = 2000 }) => {
  const job = await enqueueSendQuizzesJob({
    queue,
    user,
    quizzes,
    delayMs,
  });

  return {
    queued: true,
    jobId: job.id,
  };
};

module.exports = {
  enqueueQuizzesForUser,
};
