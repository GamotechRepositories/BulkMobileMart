import express from "express";
import multer from "multer";
import { uploadImage, processImageVariants } from "../controllers/uploadController.js";
import { getPresignedUploadUrl } from "../controllers/presignController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { MAX_HERO_BANNER_BYTES } from "../utils/imageValidation.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_HERO_BANNER_BYTES },
});

// Direct upload through server (kept for fallback)
router.post(
  "/image",
  optionalProtect,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (!err) return next();
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image must be under 5 MB",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Invalid image upload",
      });
    });
  },
  uploadImage
);

// Generate WebP variants for an image already uploaded via presigned URL
router.post("/process-variants", optionalProtect, processImageVariants);

// Presigned URL — browser uploads directly to S3, no file passes through the server
router.post("/presign", optionalProtect, getPresignedUploadUrl);

export default router;
