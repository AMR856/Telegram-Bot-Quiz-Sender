const { CustomError } = require("../../models/customError");
const HttpStatusMessages = require("../../models/httpStatusMessages");

class JobService {
  static async getStatus({ queue, jobId, userId }) {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new CustomError(404, "job not found", HttpStatusMessages.FAIL);
    }

    if (job.data?.user?.id !== userId) {
      throw new CustomError(403, "Forbidden", HttpStatusMessages.FAIL);
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
  }
}

module.exports = {
  JobService,
};
