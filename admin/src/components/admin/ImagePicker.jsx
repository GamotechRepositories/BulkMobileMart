import { useState } from "react";
import { uploadImageFile } from "../../api/api";
import { UPLOAD_FOLDER_LABELS } from "../../utils/uploadFolders";
import {
  isProductImageFolder,
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_HINT,
  PRODUCT_IMAGE_MIN_SIZE,
  readImageDimensions,
  validateProductImageFile,
} from "../../utils/productImageUpload";
import { labelClass } from "./adminStyles";

const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_HINT = "JPG, PNG, WEBP or GIF · Max 5 MB";

function ImagePicker({
  label,
  value,
  onChange,
  folder,
  required = false,
  hint,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const folderLabel = UPLOAD_FOLDER_LABELS[folder] || folder;
  const isProduct = isProductImageFolder(folder);
  const displayHint = hint || (isProduct ? PRODUCT_IMAGE_HINT : DEFAULT_HINT);
  const accept = isProduct ? PRODUCT_IMAGE_ACCEPT : "image/*";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (isProduct) {
      const validationError = validateProductImageFile(file);
      if (validationError) {
        setError(validationError);
        setNotice("");
        return;
      }

      try {
        const { width, height } = await readImageDimensions(file);
        if (width < PRODUCT_IMAGE_MIN_SIZE || height < PRODUCT_IMAGE_MIN_SIZE) {
          setNotice(
            `Image is ${width}×${height}px. It will be padded to ${PRODUCT_IMAGE_MIN_SIZE}×${PRODUCT_IMAGE_MIN_SIZE}px with a white background.`
          );
        } else {
          setNotice("");
        }
      } catch {
        setNotice("");
      }
    } else {
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file");
        return;
      }

      if (file.size > MAX_BYTES) {
        setError("Image must be under 5 MB");
        return;
      }
      setNotice("");
    }

    setUploading(true);
    setError("");

    try {
      const { data } = await uploadImageFile(file, folder);
      onChange(data.data.url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload image"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className={labelClass}>
          {label}
          {required ? " *" : ""}
        </label>
      )}

      {value ? (
        <div className="mt-2 space-y-2">
          <div className="product-image mx-auto max-w-sm overflow-hidden rounded-lg border border-border-light">
            <img src={value} alt="Uploaded preview" />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-orange-50">
              {uploading ? "Uploading..." : "Change image"}
              <input
                type="file"
                accept={accept}
                className="hidden"
                disabled={uploading}
                onChange={handleFile}
              />
            </label>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-light bg-white px-4 py-6 transition hover:border-primary/40 hover:bg-orange-50/30">
          <svg className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="mt-2 text-sm font-medium text-text-primary">
            {uploading
              ? isProduct
                ? "Processing & uploading..."
                : "Uploading to S3..."
              : "Choose from gallery"}
          </span>
          <span className="mt-1 text-center text-xs text-text-muted">
            {displayHint}
            {isProduct ? null : (
              <>
                {" "}
                · Saves to <span className="font-medium">{folder}/</span>
              </>
            )}
          </span>
          {!isProduct && (
            <span className="mt-0.5 text-[10px] text-text-muted">{folderLabel}</span>
          )}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
      )}

      {notice && <p className="mt-2 text-xs text-amber-700">{notice}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {required && !value && (
        <p className="mt-1 text-xs text-text-muted">Upload an image to continue</p>
      )}
    </div>
  );
}

export default ImagePicker;
