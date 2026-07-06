export default function ShipmentExtraDetails({ shipment }) {
  if (!shipment?.note && !shipment?.evidenceUrl) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1">
      {shipment.note ? (
        <p className="text-sm text-neutral-700">
          <span className="font-semibold text-neutral-900">Shipment note: </span>
          {shipment.note}
        </p>
      ) : null}
      {shipment.evidenceUrl ? (
        <p className="text-sm text-neutral-700">
          <span className="font-semibold text-neutral-900">Shipment photo: </span>
          <a
            href={shipment.evidenceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {shipment.evidenceName || "View photo"}
          </a>
        </p>
      ) : null}
    </div>
  );
}
