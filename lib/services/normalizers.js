const fs = require("fs");
const path = require("path");

class Normalizers {
  static #CLOUDINARY_HOST_PATTERN = /^(?:https?:\/\/)?(?:res\.)?cloudinary\.com\//i;
  static #CLOUDINARY_PROTOCOL_PREFIX = "https://res.cloudinary.com/";
  static #URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+-.]*:/;
  static #EXPLICIT_RELATIVE_PATTERN = /^(\.\/|\.\.\/)/;

  constructor({
    cloudName,
    chatId,
    baseFilePath = null,
  } = {}) {
    this.cloudName = cloudName;
    this.chatId = chatId;
    this.baseFilePath = baseFilePath;
  }

  isCloudinaryUrl(url) {
    if (!url || typeof url !== "string") return false;
    return Normalizers.#CLOUDINARY_HOST_PATTERN.test(url);
  }

  normalizeUrl(url) {
    if (!url) return url;

    if (url.startsWith("//res.cloudinary.com/")) {
      return `https:${url}`;
    }

    if (this.isCloudinaryUrl(url)) {
      return url.startsWith("http") ? url : `https://${url}`;
    }

    return url;
  }

  buildDeliveryUrl(publicId) {
    if (!publicId) return publicId;

    const encodedCloudName = encodeURIComponent(this.cloudName);
    const encodedPublicId = this.#encodePublicId(publicId);

    return `${Normalizers.#CLOUDINARY_PROTOCOL_PREFIX}${encodedCloudName}/image/upload/${encodedPublicId}`;
  }

  buildPublicId(chatFolder, mediaPath) {
    const normalizedPath = String(mediaPath).replace(/^\/+/, "");

    if (!chatFolder || normalizedPath === chatFolder || normalizedPath.startsWith(`${chatFolder}/`)) {
      return normalizedPath;
    }

    return `${chatFolder}/${normalizedPath}`;
  }

  #encodePublicId(publicId) {
    return publicId
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  static resolveFolderName(chatId) {
    return String(chatId || "")
      .trim()
      .replace(/-/g, "");
  }

  resolveFolderName(chatId) {
    return Normalizers.resolveFolderName(chatId);
  }

  isAbsoluteUrl(value) {
    if (!value || typeof value !== "string") return false;
    return Normalizers.#URL_SCHEME_PATTERN.test(value);
  }

  isAbsoluteFilePath(value) {
    if (!value || typeof value !== "string") return false;
    return path.isAbsolute(value);
  }

  isExplicitRelativePath(value) {
    if (!value || typeof value !== "string") return false;
    return Normalizers.#EXPLICIT_RELATIVE_PATTERN.test(value);
  }

  resolveRelativePath(relative, baseFilePath) {
    if (!baseFilePath) return null;

    const resolved = path.resolve(path.dirname(baseFilePath), relative);
    return fs.existsSync(resolved) ? resolved : null;
  }

  normalize(mediaPath) {
    if (!mediaPath || typeof mediaPath !== "string") {
      return mediaPath;
    }

    const trimmedPath = mediaPath.trim();

    if (this.cloudName && this.isCloudinaryUrl(trimmedPath)) {
      return this.normalizeUrl(trimmedPath);
    }

    if (this.isAbsoluteUrl(trimmedPath)) {
      return trimmedPath;
    }

    if (this.isAbsoluteFilePath(trimmedPath)) {
      return trimmedPath;
    }

    if (this.baseFilePath) {
      const isExplicitRelative = this.isExplicitRelativePath(trimmedPath);
      const resolvedPath = this.resolveRelativePath(trimmedPath, this.baseFilePath);

      if (isExplicitRelative || resolvedPath) {
        return resolvedPath || trimmedPath;
      }
    }

    if (this.cloudName && this.chatId) {
      const chatFolder = Normalizers.resolveFolderName(this.chatId);
      const publicId = this.buildPublicId(chatFolder, trimmedPath);
      return this.buildDeliveryUrl(publicId);
    }

    return trimmedPath;
  }

  normalizeQuiz(quiz) {
    const mediaPath = quiz.photo || quiz.image;

    return {
      ...quiz,
      photo: this.normalize(mediaPath),
    };
  }
}

module.exports = {
  Normalizers,
  QuizMediaNormalizer: Normalizers,
  ChatFolderResolver: Normalizers,
};