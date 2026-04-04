const { sendQuizzesForUser } = require("../../models/quizDispatchService");

const SEND_QUIZZES_JOB_NAME = "send-quizzes";

const enqueueSendQuizzesJob = async ({ queue, user, quizzes, delayMs }) =>
  queue.add(SEND_QUIZZES_JOB_NAME, {
    user,
    quizzes,
    delayMs,
  });

const loadJobStatusForUser = async ({ queue, jobId, userId }) => {
  const job = await queue.getJob(jobId);

  if (!job) {
    return { kind: "missing" };
  }

  if (job.data?.user?.id !== userId) {
    return { kind: "forbidden" };
  }

  const [state, progress, returnValue, failedReason] = await Promise.all([
    job.getState(),
    job.progress,
    job.returnvalue,
    job.failedReason,
  ]);

  return {
    kind: "ok",
    payload: {
      id: job.id,
      state,
      progress,
      returnValue,
      failedReason,
    },
  };
};

const buildSendQuizzesProcessor = ({ cloudinaryCloudName }) => async (job) =>
  sendQuizzesForUser({
    user: job.data.user,
    quizzes: job.data.quizzes,
    cloudinaryCloudName,
    delayMs: Number(job.data.delayMs || 2000),
  });

module.exports = {
  SEND_QUIZZES_JOB_NAME,
  enqueueSendQuizzesJob,
  loadJobStatusForUser,
  buildSendQuizzesProcessor,
};
