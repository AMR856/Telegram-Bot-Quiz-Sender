import { ChatFolderResolver } from "../utils/chatMediaResolver";
import fs from "fs";
import path from "path";

interface NormalizerConfig {
  cloudName?: string;
  chatId?: string | number;
  baseFilePath?: string | null;
}

/**
 * Handles complex path normalization for local files, absolute URLs, and Cloudinary.
 */
export class QuizMediaNormalizer {
  // Regular expression to match Cloudinary URLs, allowing for optional protocol and subdomain variations.
  // This pattern is used to identify if a given URL is a Cloudinary URL.
  private static readonly CLOUDINARY_HOST_PATTERN =
    /^(?:https?:\/\/)?(?:res\.)?cloudinary\.com\//i;
  // Prefix for constructing Cloudinary delivery URLs, which is used in the buildDeliveryUrl method to create the full URL for accessing media hosted on Cloudinary.
  private static readonly CLOUDINARY_PROTOCOL_PREFIX =
    "https://res.cloudinary.com/";
  // Regular expression to detect if a string starts with a URL scheme (like http:, https:, ftp:, etc.), which is used in the isAbsoluteUrl method to determine if a given string is an absolute URL.
  private static readonly URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+-.]*:/;
  // Regular expression to detect explicit relative paths that start with ./ or ../, which is used in the normalize method to identify if a media path is an explicit relative path that should be resolved against the base file path.
  private static readonly EXPLICIT_RELATIVE_PATTERN = /^(\.\/|\.\.\/)/;

  private readonly cloudName?: string;
  private readonly chatId?: string | number;
  private readonly baseFilePath: string | null;

  constructor({
    cloudName,
    chatId,
    baseFilePath = null,
  }: NormalizerConfig = {}) {
    this.cloudName = cloudName;
    this.chatId = chatId;
    this.baseFilePath = baseFilePath;
  }

  // --- URL & Cloudinary Logic ---

  public isCloudinaryUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    // Tests if the provided URL matches the Cloudinary host pattern, 
    // which checks for URLs that start with an optional protocol followed by "res.cloudinary.com/". 
    // This method is used to determine if a given URL is a Cloudinary URL.
    return QuizMediaNormalizer.CLOUDINARY_HOST_PATTERN.test(url);
  }

  // normalizeUrl method to ensure that a given URL is properly formatted with a protocol.
  private normalizeUrl(url: string): string {
    if (url.startsWith("//res.cloudinary.com/")) {
      return `https:${url}`;
    }
    // If the URL starts with "http" (indicating it already has a protocol), it is returned as is. Otherwise, "https://" is prefixed to the URL to ensure it is a valid absolute URL. 
    // This method is used to normalize Cloudinary URLs that may be provided without a protocol.
    return url.startsWith("http") ? url : `https://${url}`;
  }

  // buildDeliveryUrl method to construct a Cloudinary delivery URL based on a given public ID.
  // It takes a public ID (which is the path to the media in Cloudinary) and constructs a full URL that can be used to access the media. 
  // The method encodes the cloud name and the segments of the public ID to ensure that the resulting URL is properly formatted and can be used to retrieve the media from Cloudinary.
  private buildDeliveryUrl(publicId: string): string {
    if (!publicId || !this.cloudName) return publicId;


    // The cloud name is encoded using encodeURIComponent to ensure that any special characters in the cloud name are properly escaped in the URL.
    // The public ID is split into segments by the "/" character, and each segment is also encoded using encodeURIComponent to ensure that any special characters in the path are properly escaped. 
    // The segments are then joined back together with "/" to form the path portion of the URL. 
    // Finally, the full URL is constructed by combining the Cloudinary protocol prefix, 
    // the encoded cloud name, and the encoded path segments.
    const encodedCloudName = encodeURIComponent(this.cloudName);
    const segments = publicId
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");

    return `${QuizMediaNormalizer.CLOUDINARY_PROTOCOL_PREFIX}${encodedCloudName}/image/upload/${segments}`;
  }

  // --- Path Resolution ---

  public isAbsoluteUrl(value: string | null | undefined): boolean {
    if (!value || typeof value !== "string") return false;
    return QuizMediaNormalizer.URL_SCHEME_PATTERN.test(value);
  }

  private resolveLocalPath(relative: string): string | null {
    // If there is no base file path configured, we cannot resolve relative paths, so we return null.
    if (!this.baseFilePath) return null;
    // The provided relative path is resolved against the directory of the base file path using path.resolve.
    const resolved = path.resolve(path.dirname(this.baseFilePath), relative);
    return fs.existsSync(resolved) ? resolved : null;
  }

  // --- Main Orchestration ---

  public normalize(mediaPath: any): any {
    if (!mediaPath || typeof mediaPath !== "string") return mediaPath;

    const trimmed = mediaPath.trim();

    // 1. Cloudinary source
    // If the normalizer is configured with a cloud name and the provided media path is identified as a Cloudinary URL, the URL is normalized using the normalizeUrl method to ensure it has the correct protocol. 
    // This allows the normalizer to handle media paths that are already hosted on Cloudinary and ensure they are properly formatted for use in Telegram quizzes.
    if (this.cloudName && this.isCloudinaryUrl(trimmed)) {
      return this.normalizeUrl(trimmed);
    }

    // 2. Web or System Absolute
    // If the media path is identified as an absolute URL (starting with a URL scheme) or an absolute file system path, it is returned as is without modification. 
    // This allows the normalizer to handle media paths that are either hosted on the web (with a full URL) or are absolute paths on the local file system, without attempting to modify them.
    if (this.isAbsoluteUrl(trimmed) || path.isAbsolute(trimmed)) {
      return trimmed;
    }

    // 3. Local Relative Path
    // If the normalizer is configured with a base file path, it attempts to resolve the provided media path as a local relative path using the resolveLocalPath method. 
    // If the path can be resolved to an existing file, the resolved path is returned. 
    // If the path cannot be resolved but matches the explicit relative pattern 
    // (starting with ./ or ../), it is returned as is, 
    // allowing for explicit relative paths to be used in contexts where they can be resolved later. 
    // This allows the normalizer to handle media paths that are specified as relative paths in relation to a base file, which is common when loading quizzes from files.
    if (this.baseFilePath) {
      const resolved = this.resolveLocalPath(trimmed);
      if (
        resolved ||
        QuizMediaNormalizer.EXPLICIT_RELATIVE_PATTERN.test(trimmed)
      ) {
        return resolved || trimmed;
      }
    }

    // 4. Default to Cloudinary Upload mapping
    // If the normalizer is configured with a cloud name and chat ID, it assumes that the provided media path is intended to be a reference to media that will be uploaded to Cloudinary. 
    // It constructs a Cloudinary public ID by ensuring that the media path is prefixed with the folder corresponding to the chat ID (using ChatFolderResolver) and then builds a delivery URL for that public ID using the buildDeliveryUrl method. 
    // This allows the normalizer to handle media paths that are intended to be uploaded to Cloudinary, even if they are provided in a simple format, by mapping them to the appropriate Cloudinary URLs based on the chat ID.
    if (this.cloudName && this.chatId) {
      const folder = ChatFolderResolver.resolveFolderName(this.chatId);
      // Ensure the path is prefixed with the folder correctly
      const publicId = trimmed.startsWith(folder)
        ? trimmed
        : `${folder}/${trimmed.replace(/^\/+/, "")}`;
      return this.buildDeliveryUrl(publicId);
    }

    return trimmed;
  }

  public normalizeQuiz<T extends { photo?: any; image?: any }>(
    quiz: T,
  ): T & { photo: any } {
    const mediaPath = quiz.photo || quiz.image;
    return {
      ...quiz,
      photo: this.normalize(mediaPath),
    };
  }
}
