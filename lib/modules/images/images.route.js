const express = require("express");
const { authMiddleware } = require("../../middlewares/auth");
const { uploadImage } = require("./images.controller");
const { asyncHandler } = require("../../utils/asyncHandler");

const buildImagesRouter = ({ upload }) => {
  const router = express.Router();

  router.post(
    "/upload",
    authMiddleware,
    upload.single("image"),
    asyncHandler(uploadImage),
  );

  return router;
};

module.exports = {
  buildImagesRouter,
};
