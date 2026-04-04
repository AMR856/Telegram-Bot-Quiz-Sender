const { getJobStatusForUser } = require("./jobs.service");
const { jobParamsSchema } = require("./jobs.validation");
const HttpMessages = require("../../models/httpStatusMessages");
const { createHttpError } = require("../../models/customError");
const { sendSuccess } = require("../../utils/httpResponse");


const buildJobsController = ({ queue }) => ({
  getJobStatus: async (req, res) => {
    const { id } = jobParamsSchema.parse(req.params || {});

    const status = await getJobStatusForUser({
      queue,
      jobId: id,
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
