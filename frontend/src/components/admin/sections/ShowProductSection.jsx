import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteProduct, getAllProducts } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import ProductDetailModal from "../ProductDetailModal";
import { btnDanger, btnSecondary, compactTableClass, tableClass, tdClass, thClass } from "../adminStyles";

function ShowProductSection() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllProducts();
      setProducts(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedProduct(null);
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const handleEdit = (product) => {
    navigate("/admin/products/add", { state: { editProduct: product } });
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this product?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteProduct(id);
      setSuccess("Product deleted");
      if (selectedProduct?._id === id) setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product");
    }
  };

  return (
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className="mb-4">
        <p className="text-sm text-text-secondary">
          All products ({products.length}) · Click a row to view full details
        </p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-text-secondary">No products yet.</p>
      ) : (
        <div className={tableClass}>
          <table className={compactTableClass}>
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className={thClass}>Image</th>
                <th className={thClass}>Product Name</th>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Categories</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>Stock</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product._id}
                  onClick={() => setSelectedProduct(product)}
                  className="border-b border-border-light last:border-0 cursor-pointer transition hover:bg-mobile-surface/80"
                >
                  <td className={tdClass}>
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-border-light bg-mobile-surface">
                      {product.productImages?.[0] ? (
                        <img
                          src={product.productImages[0]}
                          alt={product.name}
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className={`${tdClass} font-medium`}>
                    <span className="line-clamp-2 break-words">{product.name}</span>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>
                    <span className="block truncate">{product.brandName}</span>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>
                    <span className="block truncate">{product.categories?.join(", ") || "—"}</span>
                  </td>
                  <td className={tdClass}>
                    <span className="font-semibold text-primary">
                      ₹{product.discountedPrice}
                    </span>
                    <span className="block text-xs text-text-muted line-through">
                      ₹{product.price}
                    </span>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>{product.stock}</td>
                  <td className={tdClass}>
                    <span
                      className={
                        product.isActive ? "text-green-600" : "text-red-500"
                      }
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        className={btnSecondary}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(product._id, e)}
                        className={btnDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEdit={handleEdit}
      />
    </div>
  );
}

export default ShowProductSection;
