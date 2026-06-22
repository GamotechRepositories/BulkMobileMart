import { useMemo } from "react";
import SectionHeader from "../mobile/SectionHeader";
import DealProductCard from "../product/DealProductCard";
import { useProductCartActions } from "../../hooks/useProductCartActions";

const MOBILE_ITEMS_PER_SLIDE = 4;

function chunkProducts(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function HomeProductRow({ title, viewAllTo, products, loading }) {
  const { getCartQuantity, handleAdd, handleIncrease, handleDecrease } =
    useProductCartActions();

  const mobileBatches = useMemo(
    () => chunkProducts(products, MOBILE_ITEMS_PER_SLIDE),
    [products]
  );

  const cardProps = (product) => ({
    product,
    onAdd: handleAdd,
    onIncrease: handleIncrease,
    onDecrease: handleDecrease,
    cartQuantity: getCartQuantity(product),
    layout: "grid",
  });

  if (!loading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className="bg-white px-4 py-3 sm:px-6 md:px-8">
      <SectionHeader title={title} viewAllTo={viewAllTo} className="mb-2" />

      {loading ? (
        <>
          <div className="md:hidden">
            <div className="grid grid-cols-2 grid-rows-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`product-row-mobile-skeleton-${index}`}
                  className="h-[258px] animate-pulse rounded-xl border border-border-light bg-gray-100"
                />
              ))}
            </div>
          </div>
          <div className="hidden grid-cols-4 gap-4 md:grid lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`product-row-desktop-skeleton-${index}`}
                className="h-[258px] animate-pulse rounded-xl border border-border-light bg-gray-100"
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="md:hidden">
            <div className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1">
              {mobileBatches.map((batch, batchIndex) => (
                <div
                  key={`${title}-batch-${batchIndex}`}
                  className="w-full shrink-0 snap-start"
                >
                  <div className="grid grid-cols-2 grid-rows-2 gap-2.5">
                    {batch.map((product) => (
                      <DealProductCard key={product._id} {...cardProps(product)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden grid-cols-4 gap-4 md:grid lg:grid-cols-6">
            {products.map((product) => (
              <DealProductCard key={`desktop-${product._id}`} {...cardProps(product)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default HomeProductRow;
