import express from "express";
import multer from "multer";
import { uploadImage } from "../controllers/uploadController.js";
import { optionalProtect } from "../middleware/authMiddleware.js";
import { MAX_IMAGE_FILE_BYTES } from "../utils/imageValidation.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_FILE_BYTES },
});

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

export default router;
