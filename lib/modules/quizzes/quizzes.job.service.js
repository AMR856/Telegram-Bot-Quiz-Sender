const { QuizDispatcher } = require("../../services/quizDispatcher");

const SEND_QUIZZES_JOB_NAME = "send-quizzes";

const quizProcesser = async (job) =>
  QuizDispatcher.dispatchQuizzes({
    user: job.data.user,
    quizzes: job.data.quizzes,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    delayMs: Number(job.data.delayMs || 2000),
  });

module.exports = {
  SEND_QUIZZES_JOB_NAME,
  quizProcesser
};
