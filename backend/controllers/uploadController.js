import {
  isUploadFolder,
  uploadBufferToS3,
  isS3Configured,
} from "../utils/s3Upload.js";
import { MAX_IMAGE_FILE_BYTES } from "../utils/imageValidation.js";
import {
  isAllowedProductImageMime,
  isProductUploadFolder,
  processProductImageBuffer,
  PRODUCT_IMAGE_MIN_SIZE,
} from "../utils/productImageProcessing.js";
import {
  ADMIN_UPLOAD_FOLDERS,
  PUBLIC_UPLOAD_FOLDERS,
  USER_UPLOAD_FOLDERS,
  normalizeUploadFolder,
} from "../utils/uploadFolders.js";

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

    if (req.file.size > MAX_IMAGE_FILE_BYTES) {
      return res.status(400).json({
        success: false,
        message: "Image must be under 5 MB",
      });
    }

    let uploadBuffer = req.file.buffer;
    let mimeType = req.file.mimetype;

    if (isProductUploadFolder(folder)) {
      if (!isAllowedProductImageMime(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Product images must be JPG, PNG, or WEBP",
        });
      }

      try {
        uploadBuffer = await processProductImageBuffer(req.file.buffer);
        mimeType = "image/jpeg";
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || "Failed to process product image",
        });
      }
    }

    const uploaded = await uploadBufferToS3({
      buffer: uploadBuffer,
      mimeType,
      folder,
      originalName: isProductUploadFolder(folder)
        ? req.file.originalname.replace(/\.\w+$/, ".jpg")
        : req.file.originalname,
    });

    return res.status(201).json({
      success: true,
      message: isProductUploadFolder(folder)
        ? `Product image standardized to ${PRODUCT_IMAGE_MIN_SIZE}×${PRODUCT_IMAGE_MIN_SIZE}px and uploaded to ${uploaded.folder}/`
        : `Image uploaded to ${uploaded.folder}/`,
      data: uploaded,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image",
    });
  }
};
