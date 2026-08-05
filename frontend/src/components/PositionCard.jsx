function PositionCard({
  trackedPlane,
  flightHistory,
  heading,
}) {
  return (
    <div className="detail-list">
      <DetailItem
        label="Latitude"
        value={
          trackedPlane.latitude != null
            ? Number(
                trackedPlane.latitude
              ).toFixed(4)
            : "-"
        }
      />

      <DetailItem
        label="Longitude"
        value={
          trackedPlane.longitude != null
            ? Number(
                trackedPlane.longitude
              ).toFixed(4)
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
        label="Rota noktası"
        value={flightHistory?.length ?? 0}
      />

      <DetailItem
        label="Dikey hız"
        value={
          trackedPlane.vertical_rate != null
            ? `${Number(
                trackedPlane.vertical_rate
              ).toFixed(1)} m/s`
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

export default PositionCard;
