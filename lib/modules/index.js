const express = require("express");
const { buildHealthRouter } = require("./health/health.route");
const { buildAuthRouter } = require("./auth/auth.route");
const { buildImagesRouter } = require("./images/images.route");
const { buildQuizzesRouter } = require("./quizzes/quizzes.route");
const { buildJobsRouter } = require("./jobs/jobs.route");

const buildModulesRouter = ({ queue, upload }) => {
  const router = express.Router();

  router.use(buildHealthRouter());
  router.use("/auth", buildAuthRouter());
  router.use("/images", buildImagesRouter({ upload }));
  router.use("/quizzes", buildQuizzesRouter({ queue }));
  router.use("/jobs", buildJobsRouter({ queue }));

  return router;
};

module.exports = {
  buildModulesRouter,
};
