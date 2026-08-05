function AircraftCard({
  aircraftInformation,
  aircraftLoading,
  aircraftNotFound,
  trackedPlane,
}) {
  if (aircraftLoading) {
    return (
      <PanelMessage>
        Uçak bilgileri yükleniyor...
      </PanelMessage>
    );
  }

  if (aircraftNotFound) {
    return (
      <PanelMessage>
        Bu uçak için detaylı bilgi bulunamadı.
      </PanelMessage>
    );
  }

  if (!aircraftInformation) {
    return null;
  }

  const registration =
    aircraftInformation.registration || "";
  const aircraftFlag =
    getRegistrationFlag(registration);
  const aircraftCategory =
    getAircraftCategory(
      aircraftInformation.icao_type
    );

  return (
    <div className="aircraft-card">
      <div className="aircraft-hero">
        <div className="aircraft-icon">✈</div>

        <div className="aircraft-main">
          <div className="aircraft-title-row">
            <div>
              <h3>
                {[
                  aircraftInformation.manufacturer,
                  aircraftInformation.model,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  "Bilinmeyen uçak"}
              </h3>

              <p>{aircraftCategory}</p>
            </div>

            {aircraftInformation.icao_type && (
              <span className="type-badge">
                {aircraftInformation.icao_type}
              </span>
            )}
          </div>

          <p className="aircraft-operator">
            {aircraftInformation.operator ||
              aircraftInformation.owner ||
              "Operatör bilinmiyor"}
          </p>

          <span className="registration-badge">
            {aircraftFlag}{" "}
            {registration || "Tescil bilinmiyor"}
          </span>
        </div>
      </div>

      <div className="aircraft-rows">
        <InfoRow
          label="Registration"
          value={registration || "-"}
        />

        <InfoRow
          label="Operator"
          value={
            aircraftInformation.operator ||
            aircraftInformation.owner ||
            "-"
          }
        />

        <InfoRow
          label="Manufacturer"
          value={
            aircraftInformation.manufacturer ||
            "-"
          }
        />

        <InfoRow
          label="Model"
          value={
            aircraftInformation.model || "-"
          }
        />

        <InfoRow
          label="ICAO Type"
          value={
            aircraftInformation.icao_type || "-"
          }
        />

        <InfoRow
          label="Country"
          value={
            aircraftInformation.registered_country ||
            trackedPlane.origin_country ||
            trackedPlane.country ||
            "-"
          }
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanelMessage({ children }) {
  return (
    <p className="panel-message">{children}</p>
  );
}

function getRegistrationFlag(registration) {
  if (!registration) {
    return "🌍";
  }

  const normalized = registration
    .trim()
    .toUpperCase();

  const prefixFlags = [
    ["TC-", "🇹🇷"],
    ["D-", "🇩🇪"],
    ["G-", "🇬🇧"],
    ["F-", "🇫🇷"],
    ["I-", "🇮🇹"],
    ["EC-", "🇪🇸"],
    ["PH-", "🇳🇱"],
    ["OO-", "🇧🇪"],
    ["HB-", "🇨🇭"],
    ["OE-", "🇦🇹"],
    ["CS-", "🇵🇹"],
    ["EI-", "🇮🇪"],
    ["OH-", "🇫🇮"],
    ["SE-", "🇸🇪"],
    ["LN-", "🇳🇴"],
    ["OY-", "🇩🇰"],
    ["SP-", "🇵🇱"],
    ["OK-", "🇨🇿"],
    ["HA-", "🇭🇺"],
    ["YR-", "🇷🇴"],
    ["SX-", "🇬🇷"],
    ["RA-", "🇷🇺"],
    ["UR-", "🇺🇦"],
    ["4X-", "🇮🇱"],
    ["A6-", "🇦🇪"],
    ["A7-", "🇶🇦"],
    ["HZ-", "🇸🇦"],
    ["VT-", "🇮🇳"],
    ["B-", "🇨🇳"],
    ["JA", "🇯🇵"],
    ["HL", "🇰🇷"],
    ["HS-", "🇹🇭"],
    ["PK-", "🇮🇩"],
    ["9M-", "🇲🇾"],
    ["9V-", "🇸🇬"],
    ["VH-", "🇦🇺"],
    ["ZK-", "🇳🇿"],
    ["C-", "🇨🇦"],
    ["N", "🇺🇸"],
    ["PR-", "🇧🇷"],
    ["PT-", "🇧🇷"],
    ["LV-", "🇦🇷"],
    ["CC-", "🇨🇱"],
    ["XA-", "🇲🇽"],
    ["5N-", "🇳🇬"],
    ["ZS-", "🇿🇦"],
  ];

  return (
    prefixFlags.find(([prefix]) =>
      normalized.startsWith(prefix)
    )?.[1] || "🌍"
  );
}

function getAircraftCategory(icaoType) {
  if (!icaoType) {
    return "Aircraft";
  }

  const type = icaoType.trim().toUpperCase();

  if (
    type.startsWith("B7") ||
    type.startsWith("A3") ||
    type.startsWith("A2") ||
    type.startsWith("E1") ||
    type.startsWith("E2") ||
    type.startsWith("CRJ")
  ) {
    return "Commercial Passenger Aircraft";
  }

  if (
    type.startsWith("C17") ||
    type.startsWith("C30") ||
    type.startsWith("AN") ||
    type.startsWith("IL")
  ) {
    return "Cargo or Transport Aircraft";
  }

  if (
    type.startsWith("H") ||
    type.startsWith("EC") ||
    type.startsWith("AS")
  ) {
    return "Helicopter";
  }

  return "General Aviation Aircraft";
}

export default AircraftCard;
