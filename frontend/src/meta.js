const PIXEL_ID = "925844543896153";

const isPixelReady = () =>
  typeof window !== "undefined" &&
  typeof window.fbq === "function";

export const trackPageView = () => {
  if (!isPixelReady()) return;

  window.fbq("track", "PageView");
};

export const trackViewContent = ({
  productId,
  sku,
  productName,
  price,
}) => {
  if (!isPixelReady()) return;

  const contentId = String(sku || productId || "");
  if (!contentId) return;

  window.fbq("track", "ViewContent", {
    content_ids: [contentId],
    content_name: productName,
    content_type: "product",
    value: Number(price || 0),
    currency: "INR",
  });
};

export const trackAddToCart = ({
  productId,
  sku,
  productName,
  price,
  quantity = 1,
}) => {
  if (!isPixelReady()) return;

  const contentId = String(sku || productId || "");
  if (!contentId) return;

  window.fbq("track", "AddToCart", {
    content_ids: [contentId],
    content_name: productName,
    content_type: "product",
    value: Number(price || 0) * Number(quantity || 1),
    currency: "INR",
    contents: [
      {
        id: contentId,
        quantity: Number(quantity || 1),
        item_price: Number(price || 0),
      },
    ],
  });
};

export const trackInitiateCheckout = ({
  items = [],
  totalAmount = 0,
}) => {
  if (!isPixelReady()) return;

  const contentIds = items
    .map((item) => String(item.sku || item.productId || item._id || item.id || ""))
    .filter(Boolean);

  window.fbq("track", "InitiateCheckout", {
    content_ids: contentIds,
    content_type: "product",
    value: Number(totalAmount || 0),
    currency: "INR",
    contents: items.map((item) => ({
      id: String(item.sku || item.productId || item._id || item.id || ""),
      quantity: Number(item.quantity || 1),
      item_price: Number(item.price || 0),
    })),
  });
};

export const trackPurchase = ({
  orderId,
  items = [],
  totalAmount = 0,
}) => {
  if (!isPixelReady()) return;

  const contentIds = items
    .map((item) => String(item.sku || item.productId || item._id || item.id || ""))
    .filter(Boolean);

  window.fbq("track", "Purchase", {
    content_ids: contentIds,
    content_type: "product",
    value: Number(totalAmount || 0),
    currency: "INR",
    contents: items.map((item) => ({
      id: String(item.sku || item.productId || item._id || item.id || ""),
      quantity: Number(item.quantity || 1),
      item_price: Number(item.price || 0),
    })),
  });
};