function getAllowedImageHosts() {
  const hosts = new Set(["res.cloudinary.com"]);

  if (process.env.CLOUDFRONT_URL) {
    try {
      hosts.add(new URL(process.env.CLOUDFRONT_URL).hostname);
    } catch {
      // ignore invalid CLOUDFRONT_URL
    }
  }

  return hosts;
}

function isAllowedImageUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    return getAllowedImageHosts().has(url.hostname);
  } catch {
    return false;
  }
}

export async function proxyImage(req, res) {
  const imageUrl = String(req.query.url || "").trim();

  if (!imageUrl) {
    return res.status(400).json({ message: "Image URL is required" });
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return res.status(403).json({ message: "Image URL is not allowed" });
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return res.status(response.status).json({ message: "Failed to fetch image" });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch {
    res.status(502).json({ message: "Failed to fetch image" });
  }
}
