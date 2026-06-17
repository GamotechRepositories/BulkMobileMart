import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  addProduct,
  getAllBrands,
  getAllCategories,
  uploadVideoFile,
  updateProduct,
} from "../../../api/api";
import AdminAlert from "../AdminAlert";
import ImagePicker from "../ImagePicker";
import { UPLOAD_FOLDERS } from "../../../utils/uploadFolders";
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  formHeaderClass,
  inputClass,
  labelClass,
} from "../adminStyles";

import VariantPricingFields, { EMPTY_SLAB } from "../VariantPricingFields";
import ProductSpecificationsField from "../ProductSpecificationsField";
import UploadProgressBar from "../UploadProgressBar";

function deriveDiscountPercent(price, discountedPrice) {
  const original = Number(price);
  const discounted = Number(discountedPrice);
  if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(discounted)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(((original - discounted) / original) * 100)));
}

const EMPTY_VARIANT = {
  name: "",
  inStock: true,
  pricingType: "single",
  price: "",
  discountedPrice: "",
  bulkMinOrderQuantity: "",
  slabs: [{ ...EMPTY_SLAB }],
  colors: [],
};

const createEmptyVariant = () => ({
  ...EMPTY_VARIANT,
  slabs: [{ ...EMPTY_SLAB }],
});

const SPECIFICATION_LIBRARY = [
  { name: "Model", options: [] },
  { name: "Material", options: ["PVC", "Metal", "Rubber"] },
  { name: "Connectivity", options: ["Android", "iPhone", "Type-C"] },
  { name: "Power Output (Watt)", options: [] },
  { name: "Cable Length", options: ["15cm", "1m", "1mtr", "2mtr", "3mtr"] },
  {
    name: "Warranty",
    options: ["No warranty", "Testing warranty", "6 month", "12 month", "12 Months"],
  },
  { name: "Packaging Type", options: ["Polly", "Box"] },
  { name: "Country of Origin", options: ["India", "China"] },
  { name: "Quality Grade", options: ["Premium", "Standard"] },
  { name: "Master Carton Qty", options: [] },
];

const createEmptySpecification = () => ({
  name: "",
  customName: "",
  value: "",
});

const SPEC_LIBRARY_STORAGE_KEY = "admin.productSpecificationLibrary";

function buildSpecificationLibrary(customNames = []) {
  const base = [...SPECIFICATION_LIBRARY];
  const seen = new Set(base.map((item) => item.name.toLowerCase()));

  customNames.forEach((name) => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    base.push({ name: trimmed, options: [] });
  });

  return base;
}

function mapVariantFromProduct(variant) {
  return {
    name: variant.name || "",
    inStock: variant.inStock !== false,
    pricingType: variant.pricingType === "bulk" ? "bulk" : "single",
    price: String(variant.price ?? ""),
    discountedPrice: String(variant.discountedPrice ?? ""),
    bulkMinOrderQuantity: String(variant.bulkPricing?.minOrderQuantity ?? ""),
    colors: Array.isArray(variant.colors)
      ? variant.colors.map((color) => ({
          name: color.name || "",
        }))
      : [],
    slabs:
      variant.bulkPricing?.slabs?.length > 0
        ? variant.bulkPricing.slabs.map((slab) => ({
            maxQuantity:
              slab.maxQuantity == null ? "" : String(slab.maxQuantity),
            pricePerUnit: String(slab.pricePerUnit ?? ""),
          }))
        : [{ ...EMPTY_SLAB }],
  };
}

function mapVariantToPayload(variant) {
  const base = {
    name: variant.name.trim(),
    inStock: variant.inStock !== false,
    pricingType: variant.pricingType === "bulk" ? "bulk" : "single",
    colors: (variant.colors || [])
      .filter((color) => color.name?.trim())
      .map((color) => ({
        name: color.name.trim(),
      })),
  };

  if (variant.pricingType === "bulk") {
    return {
      ...base,
      bulkPricing: {
        minOrderQuantity: Number(variant.bulkMinOrderQuantity),
        slabs: variant.slabs
          .map((slab) => ({
            maxQuantity: slab.maxQuantity.trim()
              ? Number(slab.maxQuantity)
              : null,
            pricePerUnit: Number(slab.pricePerUnit),
          }))
          .filter((slab) => Number.isFinite(slab.pricePerUnit)),
      },
    };
  }

  return {
    ...base,
    price: Number(variant.price),
    discountedPrice: Number(variant.discountedPrice),
    discountedPercent: deriveDiscountPercent(variant.price, variant.discountedPrice),
    bulkPricing: { minOrderQuantity: null, slabs: [] },
  };
}

const EMPTY_FORM = {
  name: "",
  primaryCategory: "",
  subcategories: [],
  brandName: "",
  variantType: "single",
  pricingType: "single",
  price: "",
  discountedPrice: "",
  bulkMinOrderQuantity: "",
  inStock: true,
  colors: [],
  ratings: "0",
  description: "",
  videoUrl: "",
  videoInputType: "url",
  specifications: [createEmptySpecification()],
  isActive: true,
};

function AddProductSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const editProduct = location.state?.editProduct;

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [customSpecNames, setCustomSpecNames] = useState([]);
  const [bulkSlabs, setBulkSlabs] = useState([{ ...EMPTY_SLAB }]);
  const [variants, setVariants] = useState([createEmptyVariant(), createEmptyVariant()]);
  const [productImages, setProductImages] = useState([""]);
  const [editingId, setEditingId] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(null);

  useEffect(() => {
    getAllCategories({ limit: 500 })
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => setCategories([]));
    getAllBrands({ limit: 500 })
      .then(({ data }) => setBrands(data.data || []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SPEC_LIBRARY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCustomSpecNames(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      setCustomSpecNames([]);
    }
  }, []);

  useEffect(() => {
    if (editProduct) {
      setEditingId(editProduct._id);
      setForm({
        name: editProduct.name,
        primaryCategory: editProduct.categories?.[0] || "",
        subcategories: Array.isArray(editProduct.subcategories)
          ? editProduct.subcategories
          : editProduct.subcategory
            ? [editProduct.subcategory]
            : [],
        brandName: editProduct.brandName || "",
        variantType: editProduct.variantType === "multi" ? "multi" : "single",
        pricingType: editProduct.pricingType === "bulk" ? "bulk" : "single",
        price: String(editProduct.price ?? ""),
        discountedPrice: String(editProduct.discountedPrice ?? ""),
        bulkMinOrderQuantity: String(editProduct.bulkPricing?.minOrderQuantity ?? ""),
        inStock: editProduct.inStock !== false,
        colors: Array.isArray(editProduct.colors)
          ? editProduct.colors.map((color) => ({
              name: color.name || "",
            }))
          : [],
        ratings: String(editProduct.ratings ?? 0),
        description: editProduct.description || "",
        videoUrl: editProduct.videoUrl || "",
        videoInputType: "url",
        specifications:
          Array.isArray(editProduct.specifications) &&
          editProduct.specifications.length > 0
            ? editProduct.specifications.map((spec) => ({
                name: spec.name || "",
                customName: "",
                value: spec.value || "",
              }))
            : [
                ...(editProduct.warranty
                  ? [
                      {
                        name: "Warranty",
                        customName: "",
                        value: editProduct.warranty,
                      },
                    ]
                  : []),
                ...((editProduct.features || []).map((feature, index) => ({
                  name: "__custom__",
                  customName: `Feature ${index + 1}`,
                  value: feature,
                })) || []),
                createEmptySpecification(),
              ],
        isActive: editProduct.isActive,
      });
      const slabs = editProduct.bulkPricing?.slabs || [];
      setBulkSlabs(
        slabs.length > 0
          ? slabs.map((slab) => ({
              maxQuantity:
                slab.maxQuantity == null ? "" : String(slab.maxQuantity),
              pricePerUnit: String(slab.pricePerUnit ?? ""),
            }))
          : [{ ...EMPTY_SLAB }]
      );
      const productVariants = editProduct.variants || [];
      setVariants(
        productVariants.length > 0
          ? productVariants.map(mapVariantFromProduct)
          : [createEmptyVariant(), createEmptyVariant()]
      );
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
      setError("At least one product image is required");
      return;
    }
    if (!form.primaryCategory.trim()) {
      setError("Category is required");
      return;
    }
    if (!form.subcategories.length) {
      setError("Select at least one subcategory");
      return;
    }
    if (form.variantType === "multi") {
      const namedVariants = variants.filter((variant) => variant.name.trim());
      if (namedVariants.length < 2) {
        setError("Add at least 2 variants for multi variant products");
        return;
      }
    } else if (form.pricingType === "bulk") {
      if (!form.bulkMinOrderQuantity.trim()) {
        setError("Minimum order quantity is required for bulk pricing");
        return;
      }
      const validSlabs = bulkSlabs.filter((slab) => slab.pricePerUnit.trim());
      if (validSlabs.length === 0) {
        setError("Add at least one pricing slab for bulk pricing");
        return;
      }
    }
    try {
      setError("");
      setSuccess("");
      const payload = {
        name: form.name,
        categories: [form.primaryCategory.trim()],
        subcategories: form.subcategories,
        brandName: form.brandName,
        pricingType: form.pricingType,
        variantType: form.variantType,
        inStock: form.variantType === "multi" ? undefined : form.inStock !== false,
        colors:
          form.variantType === "multi"
            ? undefined
            : (form.colors || [])
                .filter((color) => color.name?.trim())
                .map((color) => ({
                  name: color.name.trim(),
                })),
        ratings: Number(form.ratings) || 0,
        productImages: images,
        videoUrl: form.videoUrl.trim(),
        description: form.description,
        specifications: form.specifications
          .map((spec) => {
            const selectedName = spec.name === "__custom__" ? spec.customName : spec.name;
            if (spec.name === "__custom__" && selectedName?.trim()) {
              persistCustomSpecification(selectedName);
            }
            return {
              name: selectedName?.trim(),
              value: spec.value?.trim(),
            };
          })
          .filter((spec) => spec.name && spec.value),
        isActive: form.isActive,
      };

      if (form.variantType === "multi") {
        payload.variants = variants
          .filter((variant) => variant.name.trim())
          .map(mapVariantToPayload);
      } else if (form.pricingType === "bulk") {
        payload.bulkPricing = {
          minOrderQuantity: Number(form.bulkMinOrderQuantity),
          slabs: bulkSlabs
            .map((slab) => ({
              maxQuantity: slab.maxQuantity.trim()
                ? Number(slab.maxQuantity)
                : null,
              pricePerUnit: Number(slab.pricePerUnit),
            }))
            .filter((slab) => Number.isFinite(slab.pricePerUnit)),
        };
      } else {
        payload.price = Number(form.price);
        payload.discountedPrice = Number(form.discountedPrice);
        payload.discountedPercent = deriveDiscountPercent(form.price, form.discountedPrice);
        payload.bulkPricing = { minOrderQuantity: null, slabs: [] };
      }

      if (editingId) {
        await updateProduct(editingId, payload);
        setSuccess("Product updated");
      } else {
        await addProduct(payload);
        setSuccess("Product added");
      }

      setForm(EMPTY_FORM);
      setBulkSlabs([{ ...EMPTY_SLAB }]);
      setVariants([createEmptyVariant(), createEmptyVariant()]);
      setProductImages([""]);
      setEditingId(null);
      navigate("/products/show", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save product");
    }
  };

  const handleCancel = () => {
    setForm(EMPTY_FORM);
    setBulkSlabs([{ ...EMPTY_SLAB }]);
    setVariants([createEmptyVariant(), createEmptyVariant()]);
    setProductImages([""]);
    setEditingId(null);
    navigate("/products/show");
  };

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const handlePrimaryCategoryChange = (value) => {
    setForm((prev) => ({
      ...prev,
      primaryCategory: value,
      subcategories: [],
    }));
  };

  const toggleSubcategory = (subcategoryName) => {
    setForm((prev) => {
      const exists = prev.subcategories.some(
        (sub) => sub.toLowerCase() === subcategoryName.toLowerCase()
      );
      return {
        ...prev,
        subcategories: exists
          ? prev.subcategories.filter(
              (sub) => sub.toLowerCase() !== subcategoryName.toLowerCase()
            )
          : [...prev.subcategories, subcategoryName],
      };
    });
  };

  const isMultiVariant = form.variantType === "multi";
  const specificationLibrary = buildSpecificationLibrary(customSpecNames);

  const addSpecification = () => {
    setForm((prev) => ({
      ...prev,
      specifications: [...prev.specifications, createEmptySpecification()],
    }));
  };

  const updateSpecification = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec, i) => {
        if (i !== index) return spec;
        if (typeof field === "object" && field !== null) {
          return { ...spec, ...field };
        }
        return { ...spec, [field]: value };
      }),
    }));
  };

  const removeSpecification = (index) => {
    setForm((prev) => ({
      ...prev,
      specifications:
        prev.specifications.length === 1
          ? [createEmptySpecification()]
          : prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const reorderSpecification = (fromIndex, toIndex) => {
    setForm((prev) => {
      const specs = [...prev.specifications];
      const [item] = specs.splice(fromIndex, 1);
      specs.splice(toIndex, 0, item);
      return { ...prev, specifications: specs };
    });
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please choose a valid video file");
      return;
    }

    setVideoUploading(true);
    setVideoUploadProgress({
      percent: 0,
      loaded: 0,
      total: file.size,
      speed: 0,
    });
    setError("");

    try {
      const { data } = await uploadVideoFile(file, UPLOAD_FOLDERS.PRODUCTS, {
        onProgress: setVideoUploadProgress,
      });
      setField("videoUrl", data.data.url);
      setField("videoInputType", "upload");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to upload video");
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(null);
    }
  };

  const persistCustomSpecification = (name) => {
    const trimmed = name?.trim();
    if (!trimmed) return;

    setCustomSpecNames((prev) => {
      if (prev.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const next = [...prev, trimmed];
      window.localStorage.setItem(SPEC_LIBRARY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const selectedCategory = categories.find(
    (cat) => cat.categoryName === form.primaryCategory
  );
  const availableSubcategories = selectedCategory?.subcategories || [];

  return (
    <div className="min-w-0">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
        <div className={formHeaderClass}>
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
            <label className={labelClass}>Brand *</label>
            {brands.length > 0 ? (
              <select
                required
                value={form.brandName}
                onChange={(e) => setField("brandName", e.target.value)}
                className={inputClass}
              >
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand._id} value={brand.brandName}>
                    {brand.brandName}
                    {!brand.isActive ? " (Inactive)" : ""}
                  </option>
                ))}
                {form.brandName &&
                !brands.some(
                  (brand) =>
                    brand.brandName.toLowerCase() === form.brandName.toLowerCase()
                ) ? (
                  <option value={form.brandName}>{form.brandName}</option>
                ) : null}
              </select>
            ) : (
              <>
                <select disabled className={inputClass}>
                  <option value="">No brands available</option>
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  Add brands under Brands first, then select one here.
                </p>
              </>
            )}
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              required
              value={form.primaryCategory}
              onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.categoryName}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Subcategories *</label>
            {!form.primaryCategory ? (
              <p className="text-sm text-text-muted">Select a category first</p>
            ) : availableSubcategories.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-lg border border-border-light p-3">
                {availableSubcategories.map((sub) => {
                  const isSelected = form.subcategories.some(
                    (item) => item.toLowerCase() === sub.toLowerCase()
                  );
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubcategory(sub)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border-light bg-white text-text-primary hover:border-primary/40"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  required
                  placeholder="Enter subcategory"
                  value={form.subcategories[0] || ""}
                  onChange={(e) =>
                    setField(
                      "subcategories",
                      e.target.value.trim() ? [e.target.value.trim()] : []
                    )
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-text-muted">
                  No subcategories defined for this category. Add them under Categories first, or enter one here.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border-light p-4">
          <p className="mb-3 text-sm font-semibold text-text-primary">Product status</p>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Product is active (visible on website)
            </label>
            {!isMultiVariant ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.inStock !== false}
                  onChange={(e) => setField("inStock", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                In stock
              </label>
            ) : null}
          </div>
        </div>

        <div className={`grid gap-4 ${isMultiVariant ? "" : "sm:grid-cols-2"}`}>
          <div className="rounded-lg border border-border-light p-4">
            <p className="mb-3 text-sm font-semibold text-text-primary">Variant type</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="variantType"
                  value="single"
                  checked={form.variantType === "single"}
                  onChange={() => setField("variantType", "single")}
                  className="h-4 w-4 accent-primary"
                />
                Single variant
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="variantType"
                  value="multi"
                  checked={form.variantType === "multi"}
                  onChange={() => setField("variantType", "multi")}
                  className="h-4 w-4 accent-primary"
                />
                Multi variant
              </label>
            </div>
          </div>
          {!isMultiVariant ? (
            <div className="rounded-lg border border-border-light p-4">
              <p className="mb-3 text-sm font-semibold text-text-primary">Pricing</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricingType"
                    value="single"
                    checked={form.pricingType === "single"}
                    onChange={() => setField("pricingType", "single")}
                    className="h-4 w-4 accent-primary"
                  />
                  Single price
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricingType"
                    value="bulk"
                    checked={form.pricingType === "bulk"}
                    onChange={() => setField("pricingType", "bulk")}
                    className="h-4 w-4 accent-primary"
                  />
                  Bulk price
                </label>
              </div>
            </div>
          ) : null}
        </div>

        {isMultiVariant ? (
          <div className="space-y-4 rounded-lg border border-border-light p-4">
            <div>
              <label className={labelClass}>Product variants *</label>
              <p className="mb-3 text-xs text-text-muted">
                Each variant has its own pricing slabs or single price.
              </p>
            </div>
            {variants.map((variant, index) => (
              <div
                key={index}
                className="space-y-4 rounded-lg border border-border-light p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Variant name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Red, 128GB"
                      value={variant.name}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, name: e.target.value } : item
                          )
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  {variants.length > 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setVariants((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="mt-6 rounded-lg border border-border-light px-3 py-2 text-sm text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <VariantPricingFields
                  variant={variant}
                  onChange={(updated) =>
                    setVariants((prev) =>
                      prev.map((item, i) => (i === index ? updated : item))
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setVariants((prev) => [...prev, createEmptyVariant()])}
              className="text-sm font-semibold text-accent hover:underline"
            >
              + Add variant
            </button>
          </div>
        ) : (
          <>
            <VariantPricingFields
              showPricingType={false}
              showInStock={false}
              variant={{
                pricingType: form.pricingType,
                inStock: form.inStock,
                colors: form.colors,
                price: form.price,
                discountedPrice: form.discountedPrice,
                bulkMinOrderQuantity: form.bulkMinOrderQuantity,
                slabs: bulkSlabs,
              }}
              onChange={(updated) => {
                setForm((prev) => ({
                  ...prev,
                  pricingType: updated.pricingType,
                  inStock: updated.inStock !== false,
                  colors: updated.colors || [],
                  price: updated.price,
                  discountedPrice: updated.discountedPrice,
                  bulkMinOrderQuantity: updated.bulkMinOrderQuantity,
                }));
                setBulkSlabs(updated.slabs);
              }}
            />
          </>
        )}

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

        <div className="space-y-4">
          <label className={labelClass}>Product images *</label>
          {productImages.map((url, index) => (
            <div key={index} className="rounded-lg border border-border-light p-3">
              <ImagePicker
                label={`Image ${index + 1}`}
                folder={UPLOAD_FOLDERS.PRODUCTS}
                required={index === 0}
                value={url}
                onChange={(newUrl) => updateImageUrl(index, newUrl)}
              />
              {productImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImageField(index)}
                  className="mt-2 text-xs font-medium text-red-600 hover:underline"
                >
                  Remove this image slot
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addImageField}
            className="text-sm font-semibold text-accent hover:underline"
          >
            + Add another image
          </button>
        </div>

        <div className="space-y-3 rounded-lg border border-border-light p-4">
          <p className="text-sm font-semibold text-text-primary">Product video (optional)</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="videoInputType"
                checked={form.videoInputType === "url"}
                onChange={() => setField("videoInputType", "url")}
                className="h-4 w-4 accent-primary"
              />
              Direct video URL
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="videoInputType"
                checked={form.videoInputType === "upload"}
                onChange={() => setField("videoInputType", "upload")}
                className="h-4 w-4 accent-primary"
              />
              Upload to AWS S3
            </label>
          </div>

          {form.videoInputType === "url" ? (
            <div>
              <label className={labelClass}>Video URL</label>
              <input
                type="url"
                placeholder="https://cdn.example.com/product-video.mp4"
                value={form.videoUrl}
                onChange={(e) => setField("videoUrl", e.target.value)}
                className={inputClass}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className={labelClass}>Upload video</label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
                onChange={handleVideoUpload}
                disabled={videoUploading}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
              />
              {videoUploadProgress ? (
                <UploadProgressBar
                  percent={videoUploadProgress.percent}
                  loaded={videoUploadProgress.loaded}
                  total={videoUploadProgress.total}
                  speed={videoUploadProgress.speed}
                  label="Uploading video to S3..."
                />
              ) : null}
              <p className="text-xs text-text-muted">
                Uploads to S3 and stores the CloudFront URL in database.
              </p>
            </div>
          )}

          {form.videoUrl ? (
            <div className="rounded-lg border border-border-light p-3">
              <video src={form.videoUrl} controls className="max-h-52 w-full rounded" />
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={form.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open video URL
                </a>
                <button
                  type="button"
                  onClick={() => setField("videoUrl", "")}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove video
                </button>
              </div>
            </div>
          ) : null}
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

        <ProductSpecificationsField
          specifications={form.specifications}
          specificationLibrary={specificationLibrary}
          onAdd={addSpecification}
          onUpdate={updateSpecification}
          onRemove={removeSpecification}
          onReorder={reorderSpecification}
        />

        <button type="submit" className={btnPrimary}>
          {editingId ? "Update Product" : "Add Product"}
        </button>
      </form>
    </div>
  );
}

export default AddProductSection;
