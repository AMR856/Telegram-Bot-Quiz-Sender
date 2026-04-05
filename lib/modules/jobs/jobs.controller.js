const { JobService } = require("./jobs.service");

class JobController {
  static async getStatus(req, res, next) {
    try {
      const status = await JobService.getStatus({
        queue,
        jobId: id,
        userId: req.user.id,
      });

      res.status(201).json({
        status: HttpStatusText.SUCCESS,
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
