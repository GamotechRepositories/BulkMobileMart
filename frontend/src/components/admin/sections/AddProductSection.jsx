import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addProduct,
  getAllCategories,
  updateProduct,
} from "../../../api/api";
import AdminAlert from "../AdminAlert";
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  labelClass,
  parseList,
} from "../adminStyles";

const EMPTY_FORM = {
  name: "",
  categories: "",
  subcategory: "",
  brandName: "",
  price: "",
  discountedPrice: "",
  discountedPercent: "",
  stock: "",
  ratings: "0",
  description: "",
  features: "",
  warranty: "",
  isActive: true,
};

function AddProductSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const editProduct = location.state?.editProduct;

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [productImages, setProductImages] = useState([""]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    getAllCategories()
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (editProduct) {
      setEditingId(editProduct._id);
      setForm({
        name: editProduct.name,
        categories: (editProduct.categories || []).join(", "),
        subcategory: editProduct.subcategory || "",
        brandName: editProduct.brandName || "",
        price: String(editProduct.price ?? ""),
        discountedPrice: String(editProduct.discountedPrice ?? ""),
        discountedPercent: String(editProduct.discountedPercent ?? ""),
        stock: String(editProduct.stock ?? ""),
        ratings: String(editProduct.ratings ?? 0),
        description: editProduct.description || "",
        features: (editProduct.features || []).join(", "),
        warranty: editProduct.warranty || "",
        isActive: editProduct.isActive,
      });
      const imgs = editProduct.productImages || [];
      setProductImages(imgs.length > 0 ? imgs : [""]);
    }
  }, [editProduct]);

  const updateImageUrl = (index, value) => {
    setProductImages((prev) =>
      prev.map((item, i) => (i === index ? value : item))
    );
  };

  const addImageField = () => {
    setProductImages((prev) => [...prev, ""]);
  };

  const removeImageField = (index) => {
    setProductImages((prev) =>
      prev.length === 1 ? [""] : prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const images = productImages.map((s) => s.trim()).filter(Boolean);
    if (images.length === 0) {
      setError("At least one image URL is required");
      return;
    }
    try {
      setError("");
      setSuccess("");
      const payload = {
        name: form.name,
        categories: parseList(form.categories),
        subcategory: form.subcategory,
        brandName: form.brandName,
        price: Number(form.price),
        discountedPrice: Number(form.discountedPrice),
        discountedPercent: Number(form.discountedPercent),
        stock: Number(form.stock),
        ratings: Number(form.ratings) || 0,
        productImages: images,
        description: form.description,
        features: parseList(form.features),
        warranty: form.warranty,
        isActive: form.isActive,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        setSuccess("Product updated");
      } else {
        await addProduct(payload);
        setSuccess("Product added");
      }

      setForm(EMPTY_FORM);
      setProductImages([""]);
      setEditingId(null);
      navigate("/admin/products/show", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product");
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setProductImages([""]);
    setEditingId(null);
    navigate("/admin/products/show");
  };

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  return (
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            {editingId ? "Edit Product" : "Add Product"}
          </h3>
          {editingId && (
            <button type="button" onClick={handleCancel} className={btnSecondary}>
              Cancel
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Product name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Brand name *</label>
            <input
              type="text"
              required
              value={form.brandName}
              onChange={(e) => setField("brandName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Categories * (comma separated, max 4)</label>
            <input
              type="text"
              required
              list="category-suggestions"
              placeholder="Chargers, Most Purchase"
              value={form.categories}
              onChange={(e) => setField("categories", e.target.value)}
              className={inputClass}
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat._id} value={cat.categoryName} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Subcategory *</label>
            <input
              type="text"
              required
              value={form.subcategory}
              onChange={(e) => setField("subcategory", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Discounted price (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={form.discountedPrice}
              onChange={(e) => setField("discountedPrice", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Discount % *</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              value={form.discountedPercent}
              onChange={(e) => setField("discountedPercent", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Stock *</label>
            <input
              type="number"
              required
              min="0"
              value={form.stock}
              onChange={(e) => setField("stock", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Rating (0-5)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.ratings}
              onChange={(e) => setField("ratings", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Image URLs *</label>
          <div className="space-y-2">
            {productImages.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder={`Image URL ${index + 1}`}
                  value={url}
                  onChange={(e) => updateImageUrl(index, e.target.value)}
                  className={inputClass}
                  required={index === 0 && productImages.length === 1}
                />
                {productImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="shrink-0 rounded-lg border border-border-light px-3 py-2.5 text-sm text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    aria-label="Remove image URL"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addImageField}
            className="mt-2 text-sm font-semibold text-accent hover:underline"
          >
            + Add more
          </button>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Features (comma separated)</label>
            <input
              type="text"
              value={form.features}
              onChange={(e) => setField("features", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Warranty</label>
            <input
              type="text"
              value={form.warranty}
              onChange={(e) => setField("warranty", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setField("isActive", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Active (visible on website)
        </label>

        <button type="submit" className={btnPrimary}>
          {editingId ? "Update Product" : "Add Product"}
        </button>
      </form>
    </div>
  );
}

export default AddProductSection;
