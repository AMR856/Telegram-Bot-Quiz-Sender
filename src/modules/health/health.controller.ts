import { Request, Response } from "express";
import { HTTPStatusText } from "../../types/httpStatusText";
import {
  getCurrentHealthSnapshot,
  subscribeToHealth,
} from "./health.service";
import { HealthSnapshot } from "./health.type";

export class HealthController {
  public static health(_req: Request, res: Response) {
    res.status(200).json({
      status: HTTPStatusText.SUCCESS,
      data: "ok",
    });
  }

  public static stream(_req: Request, res: Response) {
    res.status(200);
    // Set headers for Server-Sent Events (SSE)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const writeSnapshot = (snapshot: HealthSnapshot) => {
      res.write(`event: health\n`);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    };

    // Send the initial health snapshot immediately upon connection
    writeSnapshot(getCurrentHealthSnapshot());

    const unsubscribe = subscribeToHealth(writeSnapshot);
  
    // ! important: Clean up the subscription when the client disconnects to prevent memory leaks
    res.on("close", () => {
      unsubscribe();
      res.end();
    });
  }
}
