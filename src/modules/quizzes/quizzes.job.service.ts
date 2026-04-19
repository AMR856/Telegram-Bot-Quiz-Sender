import { QuizDispatcher } from "../../services/quizDispatcher";

export const SEND_QUIZZES_JOB_NAME = "send-quizzes";

export const quizProcesser = async (job) =>
  QuizDispatcher.dispatchQuizzes({
    user: job.data.user,
    quizzes: job.data.quizzes,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    delayMs: Number(job.data.delayMs || 2000),
    retryWrongAfterMinutes: Number(job.data.retryWrongAfterMinutes || 0),
  });
