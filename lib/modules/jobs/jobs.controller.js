const { getJobStatusForUser } = require("./jobs.service");
const HttpMessages = require("../../types/statusMessages");
const { createHttpError } = require("../../utils/httpError");
const { sendSuccess } = require("../../utils/httpResponse");

const buildJobsController = ({ queue }) => ({
  getJobStatus: async (req, res) => {
    const status = await getJobStatusForUser({
      queue,
      jobId: req.params.id,
      userId: req.user.id,
    });

    if (status.kind === "missing") {
      throw createHttpError(404, "job not found", {
        statusText: HttpMessages.FAIL,
      });
    }

    if (status.kind === "forbidden") {
      throw createHttpError(403, "forbidden", {
        statusText: HttpMessages.FAIL,
      });
    }

    return sendSuccess(res, 200, status.payload);
  },
});

module.exports = {
  buildJobsController,
};
