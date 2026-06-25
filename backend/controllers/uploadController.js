import {
  isUploadFolder,
  isS3Configured,
} from "../utils/s3Upload.js";
import { getMaxUploadBytesForFolder } from "../utils/imageValidation.js";
import {
  ADMIN_UPLOAD_FOLDERS,
  PUBLIC_UPLOAD_FOLDERS,
  USER_UPLOAD_FOLDERS,
  normalizeUploadFolder,
} from "../utils/uploadFolders.js";
import { ImageService } from "../services/image/ImageService.js";

function canUploadToFolder(folder, user) {
  if (ADMIN_UPLOAD_FOLDERS.has(folder)) {
    return user?.role === "admin";
  }
  if (USER_UPLOAD_FOLDERS.has(folder)) {
    return Boolean(user?._id);
  }
  if (PUBLIC_UPLOAD_FOLDERS.has(folder)) {
    return true;
  }
  return false;
}

function buildUploadResponse(result) {
  return {
    key: result.key,
    folder: result.folder,
    url: result.url,
    original: result.original,
    thumb: result.thumb,
    medium: result.medium,
    large: result.large,
  };
}

export const uploadImage = async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(500).json({
        success: false,
        message: "Image upload is not configured. Check AWS settings on the server.",
      });
    }

    const folder = normalizeUploadFolder(req.body.folder || req.query.folder || "");

    if (!folder || !isUploadFolder(folder)) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload folder",
      });
    }

    if (!canUploadToFolder(folder, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to upload to this folder",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    if (req.file.size > getMaxUploadBytesForFolder(folder)) {
      return res.status(400).json({
        success: false,
        message: `Image must be under ${Math.round(getMaxUploadBytesForFolder(folder) / (1024 * 1024))} MB`,
      });
    }

    const uploaded = await ImageService.processUpload({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      folder,
      originalName: req.file.originalname,
    });

    return res.status(201).json({
      success: true,
      message: ImageService.shouldOptimize(folder)
        ? `Image optimized and uploaded to ${uploaded.folder}/`
        : `Image uploaded to ${uploaded.folder}/`,
      data: buildUploadResponse(uploaded),
    });
  } catch (error) {
    console.error("[uploadImage]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};

export const processImageVariants = async (req, res) => {
  try {
    if (!isS3Configured()) {
      return res.status(500).json({
        success: false,
        message: "Image upload is not configured. Check AWS settings on the server.",
      });
    }

    const folder = normalizeUploadFolder(req.body.folder || "");
    const { key, mimeType } = req.body;

    if (!folder || !isUploadFolder(folder)) {
      return res.status(400).json({ success: false, message: "Invalid upload folder" });
    }

    if (!ADMIN_UPLOAD_FOLDERS.has(folder)) {
      return res.status(400).json({
        success: false,
        message: "Variant generation is only available for admin asset folders",
      });
    }

    if (!canUploadToFolder(folder, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to process images in this folder",
      });
    }

    if (!key?.trim()) {
      return res.status(400).json({ success: false, message: "S3 object key is required" });
    }

    if (!key.startsWith(`${folder}/`)) {
      return res.status(400).json({
        success: false,
        message: "Key does not match the specified folder",
      });
    }

    const result = await ImageService.processExistingS3Object({
      key: key.trim(),
      folder,
      mimeType,
    });

    return res.status(200).json({
      success: true,
      message: "Image variants generated",
      data: buildUploadResponse(result),
    });
  } catch (error) {
    console.error("[processImageVariants]", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate image variants",
    });
  }
};
