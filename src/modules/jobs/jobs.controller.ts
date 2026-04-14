import { HTTPStatusText } from "../../types/httpStatusText";
import { JobService } from "./jobs.service";

export class JobController {
  public static async getStatus(req, res, next) {
    try {
      const queue = req.app.locals.queue;
      const { id } = res.locals.params || req.params;

      const status = await JobService.getStatus({
        queue,
        jobId: id,
        userId: req.user.id,
      });

      res.status(200).json({
        status: HTTPStatusText.SUCCESS,
        data: status.payload,
      });
    } catch (err) {
      next(err);
    }
  }
}
