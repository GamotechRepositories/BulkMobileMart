# Multiple shipments per order

Existing orders retain `shipment`. Additional parcels use `additionalShipments`, an array with the same schema. Existing clients can continue reading `shipment`.

All routes below retain existing admin authentication under `/api/orders/admin/:id/shipment/envia`:

- `POST /rates` and `POST /`: send `additionalShipment: true` with the existing package/rate fields to quote or create another parcel. Existing primary tracking is preserved. Additional parcels default to prepaid. For COD, explicitly send `isCod: true` and `codAmount`; the amount cannot exceed the order balance less amounts already assigned to active labels. Known extra label charges are added to the order's delivery charges.
- `POST /link`: send `additionalShipment: true` and `trackingNumber` to add externally created tracking. Duplicate numbers are rejected.
- `POST /sync` and `POST /cancel`: optionally send `trackingNumber` to target a particular parcel. Omitting it retains the primary-shipment behavior. Unknown numbers are rejected.

Clearing a parcel leaves other labels intact. If the primary parcel is cleared, the next parcel becomes primary for legacy clients. Clearing labels retains existing order charges for admin reconciliation, as before.

Webhook lookup matches both primary and additional tracking numbers. An unknown tracking number cannot overwrite a parcel through an order-reference fallback. Multi-parcel orders become delivered only when all active parcels are delivered. Customer desktop/mobile web order details expose the additional parcels' tracking.

Local verification: `node --test backend/tests/multipleShipments.test.js`. These tests cover schema serialization, independent updates, removal/promotion, aggregate delivery, and webhook routing with an in-memory order. They do not purchase real carrier labels or verify live Envia behavior.
