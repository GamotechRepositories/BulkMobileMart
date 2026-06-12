export const MAX_IMAGE_DATA_URL_LENGTH = 2_500_000;

export function isValidImageDataUrl(value) {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(value)
  );
}
