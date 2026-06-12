import { useEffect, useState } from "react";
import {
  addHeroBanner,
  deleteHeroBanner,
  getAllHeroBanners,
  updateHeroBanner,
} from "../../../api/api";
import AdminAlert from "../AdminAlert";
import ImagePicker from "../ImagePicker";
import { UPLOAD_FOLDERS } from "../../../utils/uploadFolders";
import { btnDanger, btnPrimary, cardClass, inputClass, labelClass } from "../adminStyles";

const DEVICE_LABELS = {
  desktop: "Desktop",
  mobile: "Phone",
};

function getBannerDevice(banner) {
  return banner.device === "mobile" ? "mobile" : "desktop";
}

function BannerCard({ banner, onDelete, onDeviceChange }) {
  return (
    <div className={`${cardClass} overflow-hidden p-0`}>
      <img
        src={banner.imageUrl}
        alt={banner.alt}
        className="h-36 w-full object-cover"
      />
      <div className="space-y-3 p-4">
        <div className="min-w-0 text-sm">
          <p className="font-medium truncate">{banner.alt || "Banner"}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {DEVICE_LABELS[getBannerDevice(banner)]} · Order: {banner.order}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={getBannerDevice(banner)}
            onChange={(e) => onDeviceChange(banner._id, e.target.value)}
            className={`${inputClass} max-w-[140px] py-2 text-sm`}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Phone</option>
          </select>
          <button type="button" onClick={() => onDelete(banner._id)} className={btnDanger}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBannerForm({ deviceType, onAdded }) {
  const [form, setForm] = useState({ imageUrl: "", alt: "", order: 0 });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!form.imageUrl?.trim()) {
      setError("Please upload a banner image");
      setSubmitting(false);
      return;
    }

    try {
      const { data } = await addHeroBanner({
        imageUrl: form.imageUrl.trim(),
        alt: form.alt,
        order: form.order,
        bannerFor: deviceType,
        device: deviceType,
      });

      const savedDevice = getBannerDevice(data.data);
      if (savedDevice !== deviceType) {
        throw new Error(
          `Banner was saved as ${DEVICE_LABELS[savedDevice]} instead of ${DEVICE_LABELS[deviceType]}. Restart the backend server and try again.`
        );
      }

      setForm({ imageUrl: "", alt: "", order: 0 });
      onAdded(`${DEVICE_LABELS[deviceType]} banner added successfully`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to add banner");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
      <h3 className="font-semibold">Add {DEVICE_LABELS[deviceType]} Banner</h3>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ImagePicker
        label="Banner image"
        folder={UPLOAD_FOLDERS.HERO_BANNERS}
        required
        value={form.imageUrl}
        onChange={(url) => setForm((p) => ({ ...p, imageUrl: url }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Alt text</label>
          <input
            type="text"
            placeholder="Banner description"
            value={form.alt}
            onChange={(e) => setForm((p) => ({ ...p, alt: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Display order</label>
          <input
            type="number"
            value={form.order}
            onChange={(e) =>
              setForm((p) => ({ ...p, order: Number(e.target.value) }))
            }
            className={inputClass}
          />
        </div>
      </div>
      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Adding..." : `Add ${DEVICE_LABELS[deviceType]} Banner`}
      </button>
    </form>
  );
}

function BannerSection() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllHeroBanners();
      setBanners(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDeviceChange = async (id, device) => {
    try {
      setError("");
      setSuccess("");
      await updateHeroBanner(id, { bannerFor: device, device });
      setSuccess(`Banner moved to ${DEVICE_LABELS[device]}`);
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update banner");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this hero banner?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteHeroBanner(id);
      setSuccess("Banner deleted");
      fetchBanners();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete banner");
    }
  };

  const desktopBanners = banners.filter((banner) => getBannerDevice(banner) === "desktop");
  const mobileBanners = banners.filter((banner) => getBannerDevice(banner) === "mobile");

  const renderBannerGrid = (items, emptyMessage) => {
    if (loading) return <p className="text-text-secondary">Loading...</p>;
    if (items.length === 0) {
      return <p className="text-text-secondary">{emptyMessage}</p>;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((banner) => (
          <BannerCard
            key={banner._id}
            banner={banner}
            onDelete={handleDelete}
            onDeviceChange={handleDeviceChange}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <AddBannerForm
          deviceType="desktop"
          onAdded={(message) => {
            setSuccess(message);
            fetchBanners();
          }}
        />
        <AddBannerForm
          deviceType="mobile"
          onAdded={(message) => {
            setSuccess(message);
            fetchBanners();
          }}
        />
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="mb-3 font-semibold">Desktop Banners ({desktopBanners.length})</h3>
          {renderBannerGrid(desktopBanners, "No desktop banners yet.")}
        </section>

        <section>
          <h3 className="mb-3 font-semibold">Phone Banners ({mobileBanners.length})</h3>
          {renderBannerGrid(mobileBanners, "No phone banners yet.")}
        </section>
      </div>
    </div>
  );
}

export default BannerSection;
