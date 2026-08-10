/**
 * Display-sized image URL helper (website).
 * Cloudinary gets transforms; CloudFront/S3 goes through API resize proxy.
 */
export function optimizeImageUrl(url, width = 400) {
  const raw = String(url || "").trim();
  if (!raw) return raw;

  const targetWidth = Math.max(64, Math.min(1600, Number(width) || 400));
  if (raw.includes("/api/proxy/img?")) return raw;

  if (raw.includes("res.cloudinary.com") && raw.includes("/upload/")) {
    const marker = "/upload/";
    const index = raw.indexOf(marker);
    const after = raw.slice(index + marker.length);
    if (/^(w_|c_|q_|f_)/.test(after.split("/")[0] || "")) {
      return raw;
    }
    return `${raw.slice(0, index + marker.length)}w_${targetWidth},c_limit,q_auto,f_auto/${after}`;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return raw;
    }
  } catch {
    return raw;
  }

  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (!apiBase) return raw;

  return `${apiBase}/api/proxy/img?u=${encodeURIComponent(raw)}&w=${targetWidth}`;
}
