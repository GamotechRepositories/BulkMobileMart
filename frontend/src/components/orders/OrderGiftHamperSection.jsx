import { formatOrderPrice } from "../../utils/orderUtils";

function GiftHamperImage({ src, alt, className = "h-20 w-20" }) {
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-lg border border-[#F5D0A8] bg-white p-1`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl">🎁</div>
      )}
    </div>
  );
}

function OrderGiftHamperSection({ giftHamper, className = "" }) {
  if (!giftHamper?.gift?.name) {
    return null;
  }

  const isApproved = giftHamper.status === "approved";
  const isPending = giftHamper.status === "pending";

  if (!isApproved && !isPending) {
    return null;
  }

  const title = isApproved ? "Gift Hamper" : "Gift Hamper Pending";
  const subtitle = isApproved
    ? "This complimentary gift is included with your order."
    : "Your gift hamper is being confirmed. We will update this order once it is approved.";

  return (
    <section
      className={`overflow-hidden rounded-xl border shadow-sm ${
        isApproved
          ? "border-[#F5D0A8] bg-gradient-to-br from-[#FFF8F0] to-white"
          : "border-amber-200 bg-amber-50/60"
      } ${className}`}
    >
      <div className="border-b border-black/5 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🎁
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-text-primary sm:text-base">{title}</h3>
            <p className="mt-0.5 text-xs text-text-secondary sm:text-sm">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
        <GiftHamperImage
          src={giftHamper.gift.image}
          alt={giftHamper.gift.name}
          className="h-16 w-16 sm:h-20 sm:w-20"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary sm:text-base">
            {giftHamper.gift.name}
          </p>
          {giftHamper.gift.description ? (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary sm:text-sm">
              {giftHamper.gift.description}
            </p>
          ) : null}
          {giftHamper.minOrderAmount > 0 ? (
            <p className="mt-2 text-[11px] font-medium text-text-muted sm:text-xs">
              Unlocked on orders of {formatOrderPrice(giftHamper.minOrderAmount, { withDecimals: false })}{" "}
              or more
            </p>
          ) : null}
          {isApproved ? (
            <span className="mt-3 inline-flex items-center rounded-full bg-[#2E7D32]/10 px-2.5 py-1 text-[11px] font-bold text-[#2E7D32]">
              Approved
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Pending approval
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export default OrderGiftHamperSection;
