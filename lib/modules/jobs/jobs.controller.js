const { JobService } = require("./jobs.service");
const HttpStatusMessages = require("../../core/httpStatusMessages");

class JobController {
  static async getStatus(req, res, next) {
    try {
      const queue = req.app.locals.queue;
      const { id } = res.locals.params || req.params;

      const status = await JobService.getStatus({
        queue,
        jobId: id,
        userId: req.user.id,
      });

      res.status(200).json({
        status: HttpStatusMessages.SUCCESS,
        data: status.payload,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = {
  JobController,
};
