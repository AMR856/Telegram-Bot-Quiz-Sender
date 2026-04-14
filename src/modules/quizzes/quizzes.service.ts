import { SEND_QUIZZES_JOB_NAME } from "./quizzes.job.service";

interface EnqueueQuizzesParams {
  queue: { add(name: string, payload: any): Promise<any> };
  user: unknown;
  quizzes: any[];
  delayMs?: number;
}

export class QuizzesService {
  public static async enqueueQuizzesForUser({
    queue,
    user,
    quizzes,
    delayMs = 2000,
  }: EnqueueQuizzesParams) {
    const job = await queue.add(SEND_QUIZZES_JOB_NAME, {
      user,
      quizzes,
      delayMs: Number(delayMs || 2000),
    });

    return {
      jobId: job.id,
      status: "queued",
      count: Array.isArray(quizzes) ? quizzes.length : 0,
    };
  }
}
