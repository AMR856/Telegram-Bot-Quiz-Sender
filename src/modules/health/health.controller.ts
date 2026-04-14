import { HTTPStatusText } from "../../types/httpStatusText";

export class HealthController {
  public static health(req, res) {
    res.status(200).json({
      status: HTTPStatusText.SUCCESS,
      data: "ok",
    });
  }
}
