import { createPortal } from "react-dom";
import { btnPrimary, btnSecondary } from "./adminStyles";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function DetailRow({ label, value, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border-light last:border-0 text-sm">
      <span className="font-medium text-text-secondary">{label}</span>
      <span className="text-text-primary">{children ?? value ?? "—"}</span>
    </div>
  );
}

function ProductDetailModal({ product, onClose, onEdit }) {
  if (!product) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border-light bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {product.brandName}
            </p>
            <h2 className="text-lg font-bold text-text-primary leading-snug">
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border-light p-2 text-text-secondary hover:bg-mobile-surface transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {product.productImages?.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto hide-scrollbar">
              {product.productImages.map((img, index) => (
                <div
                  key={`${img}-${index}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border-light bg-mobile-surface"
                >
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    className="h-full w-full object-contain p-1"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-border-light bg-mobile-surface/50 px-4">
            <DetailRow label="Product ID" value={product._id} />
            <DetailRow label="Brand" value={product.brandName} />
            <DetailRow label="Subcategory" value={product.subcategory} />
            <DetailRow label="Categories">
              {product.categories?.length
                ? product.categories.join(", ")
                : "—"}
            </DetailRow>
            <DetailRow label="Price">
              <span className="line-through text-text-muted mr-2">
                {formatPrice(product.price)}
              </span>
              <span className="font-semibold text-primary">
                {formatPrice(product.discountedPrice)}
              </span>
              <span className="ml-2 text-green-600 text-xs font-semibold">
                {product.discountedPercent}% off
              </span>
            </DetailRow>
            <DetailRow label="Stock" value={String(product.stock)} />
            <DetailRow label="Rating" value={`${product.ratings ?? 0} / 5`} />
            <DetailRow label="Status">
              <span className={product.isActive ? "text-green-600" : "text-red-500"}>
                {product.isActive ? "Active" : "Inactive"}
              </span>
            </DetailRow>
            <DetailRow label="Description">
              {product.description || "—"}
            </DetailRow>
            <DetailRow label="Features">
              {product.features?.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {product.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Warranty" value={product.warranty || "—"} />
            <DetailRow
              label="Created"
              value={
                product.createdAt
                  ? new Date(product.createdAt).toLocaleString("en-IN")
                  : "—"
              }
            />
            <DetailRow
              label="Updated"
              value={
                product.updatedAt
                  ? new Date(product.updatedAt).toLocaleString("en-IN")
                  : "—"
              }
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border-light bg-white px-5 py-4">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit(product);
              onClose();
            }}
            className={btnPrimary}
          >
            Edit Product
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ProductDetailModal;
