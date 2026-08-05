function FlightCard({
  trackedPlane,
  altitude,
  velocity,
  heading,
}) {
  return (
    <div className="detail-list">
      <DetailItem
        label="Callsign"
        value={
          trackedPlane.callsign?.trim() ||
          "Bilinmeyen uçuş"
        }
      />

      <DetailItem
        label="ICAO24"
        value={
          trackedPlane.icao24?.toUpperCase() || "-"
        }
      />

      <DetailItem
        label="Kayıtlı ülke"
        value={
          trackedPlane.origin_country ||
          trackedPlane.country ||
          "-"
        }
      />

      <DetailItem
        label="İrtifa"
        value={
          altitude != null
            ? `${Number(altitude).toFixed(0)} m`
            : "-"
        }
      />

      <DetailItem
        label="Hız"
        value={
          velocity != null
            ? `${(Number(velocity) * 3.6).toFixed(
                0
              )} km/h`
            : "-"
        }
      />

      <DetailItem
        label="Yön"
        value={
          heading != null
            ? `${Number(heading).toFixed(0)}°`
            : "-"
        }
      />

      <DetailItem
        label="Durum"
        value={
          trackedPlane.on_ground
            ? "Yerde"
            : "Havada"
        }
      />

      <DetailItem
        label="Son güncelleme"
        value={
          trackedPlane.last_update
            ? new Date(
                trackedPlane.last_update
              ).toLocaleString("tr-TR")
            : "-"
        }
      />
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default FlightCard;
