import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteProduct, getAllCategories, getAllProducts } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import ProductDetailModal from "../ProductDetailModal";
import { IconEdit, IconTrash } from "../AdminIcons";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  iconBtnClass,
  iconBtnDangerClass,
} from "../adminStyles";
import ProductListFilters from "./ProductListFilters";

function ShowProductSection() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    getAllCategories({ limit: 500 })
      .then(({ data }) => {
        setCategoryOptions((data.data || []).map((category) => category.categoryName));
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery, sortBy, sortDir]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit: ADMIN_PAGE_SIZE,
        sortBy,
        sortDir,
      };
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await getAllProducts(params);
      setProducts(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, searchQuery, sortBy, sortDir]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    navigate("/products/add", { state: { editProduct: product } });
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
      const nextPage = products.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete product");
    }
  };

  return (
    <div className="min-w-0">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      {loading ? (
        <p className="mt-4 text-text-secondary">Loading products...</p>
      ) : (
        <>
          <ProductListFilters
            categories={categoryOptions}
            totalCount={pagination.total}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDir={sortDir}
            onSortDirToggle={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
          />

          <p className="mb-4 mt-4 text-sm font-medium text-neutral-700">
            {pagination.total} product{pagination.total === 1 ? "" : "s"} · Click a row to view full
            details
          </p>

          {pagination.total === 0 ? (
            <p className="text-text-secondary">No products found.</p>
          ) : products.length === 0 ? (
            <p className="text-text-secondary">No products on this page.</p>
          ) : (
            <div className={adminTableWrapperClass}>
              <table className={adminCompactTableClass}>
                <colgroup>
                  <col className="w-[7%]" />
                  <col className="w-[20%]" />
                  <col className="w-[11%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr className={adminTableHeaderClass}>
                    <th className={adminCompactThClass}>Image</th>
                    <th className={adminCompactThClass}>Product Name</th>
                    <th className={adminCompactThClass}>Brand</th>
                    <th className={adminCompactThClass}>Categories</th>
                    <th className={adminCompactThClass}>Price</th>
                    <th className={adminCompactThClass}>In stock</th>
                    <th className={adminCompactThClass}>Status</th>
                    <th className={adminCompactThClass}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product._id}
                      onClick={() => setSelectedProduct(product)}
                      className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className={adminCompactTdClass}>
                        <div className="h-8 w-8 overflow-hidden rounded border border-neutral-200 bg-neutral-50">
                          {product.productImages?.[0] ? (
                            <img
                              src={product.productImages[0]}
                              alt={product.name}
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                        <span className="line-clamp-2 break-words">{product.name}</span>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="block truncate">{product.brandName}</span>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="line-clamp-2 break-words">
                          {product.categories?.length
                            ? `${product.categories.join(", ")}${
                                (product.subcategories?.length
                                  ? product.subcategories
                                  : product.subcategory
                                    ? [product.subcategory]
                                    : []
                                ).length
                                  ? ` / ${(product.subcategories?.length ? product.subcategories : [product.subcategory]).join(", ")}`
                                  : ""
                              }`
                            : "—"}
                        </span>
                      </td>
                      <td className={adminCompactTdClass}>
                        <span className="block font-semibold text-neutral-900">
                          ₹{product.discountedPrice}
                        </span>
                        <span className="block text-[10px] text-neutral-500 line-through">
                          ₹{product.price}
                        </span>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-800`}>
                        {product.inStock !== false ? "In stock" : "Out of stock"}
                      </td>
                      <td className={adminCompactTdClass}>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium lowercase ${
                            product.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.isActive ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className={adminCompactTdClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className={iconBtnClass}
                            title="Edit"
                            aria-label="Edit product"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(product._id, e)}
                            className={iconBtnDangerClass}
                            title="Delete"
                            aria-label="Delete product"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AdminPagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                loading={loading}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
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
