import HeroBanner from "../models/HeroBanner.js";

const normalizeDevice = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mobile" || normalized === "phone") return "mobile";
  return "desktop";
};

const buildDeviceFilter = (device) => {
  if (device === "mobile") {
    return { device: "mobile" };
  }
  return { $or: [{ device: "desktop" }, { device: { $exists: false } }] };
};

export const getHeroBanners = async (req, res) => {
  try {
    const device = req.query.device === "mobile" ? "mobile" : "desktop";
    const banners = await HeroBanner.find({
      isActive: true,
      ...buildDeviceFilter(device),
    }).sort({
      order: 1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({ order: 1, createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addHeroBanner = async (req, res) => {
  try {
    const { imageUrl, alt, order, isActive, device } = req.body;

    if (!imageUrl?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Image URL is required" });
    }

    const bannerDevice = normalizeDevice(
      req.body.bannerFor ?? req.body.device ?? req.query.device
    );

    const banner = await HeroBanner.create({
      imageUrl: imageUrl.trim(),
      alt: alt?.trim() || "BulkMobileMart hero banner",
      order: order ?? 0,
      isActive: isActive ?? true,
      device: bannerDevice,
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHeroBanner = async (req, res) => {
  try {
    const { device, imageUrl, alt, order, isActive } = req.body;
    const updates = {};

    const nextDevice = req.body.bannerFor ?? device ?? req.query.device;
    if (nextDevice !== undefined) {
      updates.device = normalizeDevice(nextDevice);
    }
    if (imageUrl !== undefined) updates.imageUrl = imageUrl.trim();
    if (alt !== undefined) updates.alt = alt.trim();
    if (order !== undefined) updates.order = order;
    if (isActive !== undefined) updates.isActive = isActive;

    const banner = await HeroBanner.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Hero banner not found" });
    }

    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findByIdAndDelete(req.params.id);

    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Hero banner not found" });
    }

    res.status(200).json({ success: true, message: "Hero banner deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
