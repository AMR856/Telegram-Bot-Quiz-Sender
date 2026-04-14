import CustomError from "../../utils/customError";
import { HTTPStatusText } from "../../types/httpStatusText";

interface JobServiceParams {
  queue: { getJob(jobId: string): Promise<any> };
  jobId: string;
  userId: string;
}

interface JobStatusResult {
  kind: "ok";
  payload: {
    id: string | number | undefined;
    state: string;
    progress: any;
    returnValue: any;
    failedReason: any;
  };
}

export class JobService {
  public static async getStatus({
    queue,
    jobId,
    userId,
  }: JobServiceParams): Promise<JobStatusResult> {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new CustomError("job not found", 404, HTTPStatusText.FAIL);
    }

    if (job.data?.user?.id !== userId) {
      throw new CustomError("Forbidden", 403, HTTPStatusText.FAIL);
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
