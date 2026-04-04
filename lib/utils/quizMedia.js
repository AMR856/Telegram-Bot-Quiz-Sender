const fs = require("fs");
const path = require("path");

const CLOUDINARY_HOST_PATTERN = /^(?:https?:\/\/)?(?:res\.)?cloudinary\.com\//i;
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+-.]*:/;

const sanitizeChatFolderFromChatId = (chatId) =>
  String(chatId || "")
    .trim()
    .replace(/-/g, "");

const encodeCloudinaryPublicId = (publicId) =>
  publicId
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildCloudinaryDeliveryUrl = ({ cloudName, chatId, mediaPath }) => {
  if (!cloudName || !mediaPath) {
    return mediaPath;
  }

  const chatFolder = sanitizeChatFolderFromChatId(chatId);
  const normalizedMediaPath = String(mediaPath).replace(/^\/+/, "");

  const publicId =
    chatFolder &&
    normalizedMediaPath !== chatFolder &&
    !normalizedMediaPath.startsWith(`${chatFolder}/`)
      ? `${chatFolder}/${normalizedMediaPath}`
      : normalizedMediaPath;

  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/upload/${encodeCloudinaryPublicId(publicId)}`;
};

const normalizeCloudinaryUrl = (mediaPath) => {
  if (!mediaPath) {
    return mediaPath;
  }

  if (mediaPath.startsWith("//res.cloudinary.com/")) {
    return `https:${mediaPath}`;
  }

  if (CLOUDINARY_HOST_PATTERN.test(mediaPath)) {
    return mediaPath.startsWith("http") ? mediaPath : `https://${mediaPath}`;
  }

  return mediaPath;
};

const normalizeMediaPath = ({
  mediaPath,
  baseFilePath,
  cloudinaryCloudName,
  chatId,
}) => {
  if (!mediaPath || typeof mediaPath !== "string") {
    return mediaPath;
  }

  const trimmedMediaPath = normalizeCloudinaryUrl(mediaPath.trim());

  if (!trimmedMediaPath || URL_SCHEME_PATTERN.test(trimmedMediaPath)) {
    return trimmedMediaPath;
  }

  if (path.isAbsolute(trimmedMediaPath)) {
    return trimmedMediaPath;
  }

  if (baseFilePath) {
    const resolvedLocalPath = path.resolve(path.dirname(baseFilePath), trimmedMediaPath);
    const looksLikeExplicitRelativePath = /^(\.\/|\.\.\/)/.test(trimmedMediaPath);

    if (looksLikeExplicitRelativePath || fs.existsSync(resolvedLocalPath)) {
      return resolvedLocalPath;
    }
  }

  return buildCloudinaryDeliveryUrl({
    cloudName: cloudinaryCloudName,
    chatId,
    mediaPath: trimmedMediaPath,
  });
};

const normalizeQuizObjectMedia = (quiz, options = {}) => ({
  ...quiz,
  photo: normalizeMediaPath({
    mediaPath: quiz.photo || quiz.image,
    baseFilePath: options.baseFilePath,
    cloudinaryCloudName: options.cloudinaryCloudName,
    chatId: options.chatId,
  }),
});

module.exports = {
  sanitizeChatFolderFromChatId,
  normalizeQuizObjectMedia,
  normalizeMediaPath,
};
