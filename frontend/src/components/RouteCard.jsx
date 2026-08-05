function RouteCard({
  departureAirport,
  destinationAirport,
  remainingDistanceKm,
  estimatedArrivalMinutes,
}) {
  const etaStatus =
    getEtaStatus(estimatedArrivalMinutes);

  return (
    <div className="route-card">
      <div className="route-airports">
        <AirportBlock
          icon="🛫"
          label="Kalkış"
          airport={departureAirport}
        />

        <div className="route-line">
          <span>••••••••</span>
          <span className="route-plane">✈</span>
        </div>

        <AirportBlock
          icon="🛬"
          label="Varış"
          airport={destinationAirport}
        />
      </div>

      <div className="detail-list route-metrics">
        <DetailItem
          label="Kalan mesafe"
          value={
            remainingDistanceKm != null
              ? `${remainingDistanceKm.toFixed(
                  1
                )} km`
              : "-"
          }
        />

        <div className="detail-item">
          <span>ETA</span>

          <strong
            className={`eta-value ${etaStatus}`}
          >
            {formatEta(estimatedArrivalMinutes)}
          </strong>
        </div>

        <DetailItem
          label="Kalkışa ilk kayıt uzaklığı"
          value={
            departureAirport?.distance_km != null
              ? `${Number(
                  departureAirport.distance_km
                ).toFixed(2)} km`
              : "-"
          }
        />
      </div>
    </div>
  );
}

function AirportBlock({ icon, label, airport }) {
  const code =
    airport?.iata_code ||
    airport?.icao_code ||
    airport?.ident ||
    "---";

  return (
    <div className="airport-block">
      <span className="airport-icon">{icon}</span>
      <span className="airport-label">{label}</span>
      <strong className="airport-code">
        {code}
      </strong>
      <span className="airport-name">
        {airport?.name ||
          "Havalimanı tahmin edilemedi"}
      </span>
      <span className="airport-city">
        {airport?.city ||
          airport?.municipality ||
          "-"}
      </span>
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

function formatEta(minutes) {
  if (
    minutes == null ||
    !Number.isFinite(minutes)
  ) {
    return "-";
  }

  const rounded = Math.max(
    1,
    Math.round(minutes)
  );

  if (rounded < 60) {
    return `${rounded} dk`;
  }

  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  return `${hours} sa ${remainingMinutes} dk`;
}

function getEtaStatus(minutes) {
  if (
    minutes == null ||
    !Number.isFinite(minutes)
  ) {
    return "unknown";
  }

  if (minutes < 30) {
    return "near";
  }

  if (minutes < 90) {
    return "medium";
  }

  return "far";
}

export default RouteCard;
