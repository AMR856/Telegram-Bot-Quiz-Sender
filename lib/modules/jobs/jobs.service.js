const { loadJobStatusForUser } = require("../quizzes/quizzes.job.service");

const getJobStatusForUser = async ({ queue, jobId, userId }) => {
  return loadJobStatusForUser({ queue, jobId, userId });
};

module.exports = {
  getJobStatusForUser,
};
