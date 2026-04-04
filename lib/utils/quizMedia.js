const fs = require("fs");
const path = require("path");

class CloudinaryMediaHandler {
  static #CLOUDINARY_HOST_PATTERN = /^(?:https?:\/\/)?(?:res\.)?cloudinary\.com\//i;
  static #CLOUDINARY_PROTOCOL_PREFIX = "https://res.cloudinary.com/";

  constructor(cloudName) {
    this.cloudName = cloudName;
  }


  isCloudinaryUrl(url) {
    if (!url || typeof url !== "string") return false;
    return CloudinaryMediaHandler.#CLOUDINARY_HOST_PATTERN.test(url);
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

    return `${CloudinaryMediaHandler.#CLOUDINARY_PROTOCOL_PREFIX}${encodedCloudName}/image/upload/${encodedPublicId}`;
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
}


class ChatFolderResolver {

  static resolveFolderName(chatId) {
    return String(chatId || "")
      .trim()
      .replace(/-/g, "");
  }
}


class LocalMediaResolver {
  static #URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+-.]*:/;
  static #EXPLICIT_RELATIVE_PATTERN = /^(\.\/|\.\.\/)/;


  static isAbsoluteUrl(value) {
    if (!value || typeof value !== "string") return false;
    return this.#URL_SCHEME_PATTERN.test(value);
  }


  static isAbsoluteFilePath(value) {
    if (!value || typeof value !== "string") return false;
    return path.isAbsolute(value);
  }


  static isExplicitRelativePath(value) {
    if (!value || typeof value !== "string") return false;
    return this.#EXPLICIT_RELATIVE_PATTERN.test(value);
  }


  static resolveRelativePath(relative, baseFilePath) {
    if (!baseFilePath) return null;

    const resolved = path.resolve(path.dirname(baseFilePath), relative);
    return fs.existsSync(resolved) ? resolved : null;
  }
}


class MediaPathNormalizer {
  constructor({
    cloudName,
    chatId,
    baseFilePath = null,
  } = {}) {
    this.cloudinaryHandler = cloudName ? new CloudinaryMediaHandler(cloudName) : null;
    this.chatId = chatId;
    this.baseFilePath = baseFilePath;
  }


  normalize(mediaPath) {
    if (!mediaPath || typeof mediaPath !== "string") {
      return mediaPath;
    }

    const trimmedPath = mediaPath.trim();

    if (this.cloudinaryHandler?.isCloudinaryUrl(trimmedPath)) {
      return this.cloudinaryHandler.normalizeUrl(trimmedPath);
    }

    if (LocalMediaResolver.isAbsoluteUrl(trimmedPath)) {
      return trimmedPath;
    }

    if (LocalMediaResolver.isAbsoluteFilePath(trimmedPath)) {
      return trimmedPath;
    }

    if (this.baseFilePath) {
      const isExplicitRelative = LocalMediaResolver.isExplicitRelativePath(trimmedPath);
      const resolvedPath = LocalMediaResolver.resolveRelativePath(trimmedPath, this.baseFilePath);

      if (isExplicitRelative || resolvedPath) {
        return resolvedPath || trimmedPath;
      }
    }

    if (this.cloudinaryHandler && this.chatId) {
      const chatFolder = ChatFolderResolver.resolveFolderName(this.chatId);
      const publicId = this.cloudinaryHandler.buildPublicId(chatFolder, trimmedPath);
      return this.cloudinaryHandler.buildDeliveryUrl(publicId);
    }

    return trimmedPath;
  }
}

class QuizMediaNormalizer {
  constructor(options = {}) {
    this.normalizer = new MediaPathNormalizer(options);
  }

  normalizeQuiz(quiz) {
    const mediaPath = quiz.photo || quiz.image;

    return {
      ...quiz,
      photo: this.normalizer.normalize(mediaPath),
    };
  }
}

module.exports = {
  QuizMediaNormalizer,
  MediaPathNormalizer,
  ChatFolderResolver,
  CloudinaryMediaHandler,
  LocalMediaResolver,
};