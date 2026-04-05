class QuizService {
  static async enqueue({ queue, user, quizzes, delayMs = 2000 }) {
    const job = await queue.add(SEND_QUIZZES_JOB_NAME, {
      user,
      quizzes,
      delayMs,
    });

    return {
      queued: true,
      jobId: job.id,
    };
  }
}

module.exports = {
  QuizService,
};
