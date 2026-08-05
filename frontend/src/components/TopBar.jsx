import "./TopBar.css";

function TopBar({
  statistics,
  searchText,
  onSearchChange,
  countries,
  selectedCountry,
  onCountryChange,
  visibleFlightCount,
  onRefresh,
  lastUpdated,
  loading,
}) {
  return (
    <header className="radar-toolbar">
      <div className="radar-brand">
        <div className="radar-logo">✈</div>

        <div className="radar-brand-text">
          <strong>Live Flight Tracker</strong>
          <span>
            OpenSky • Kafka • PostgreSQL
          </span>
        </div>
      </div>

      <div className="radar-search">
        <span className="radar-search-icon">
          ⌕
        </span>

        <input
          type="text"
          value={searchText}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Callsign veya ICAO24 ara"
        />
      </div>

      <select
        className="radar-country-select"
        value={selectedCountry}
        onChange={(event) =>
          onCountryChange(event.target.value)
        }
      >
        <option value="all">Tüm ülkeler</option>

        {countries.map((country) => (
          <option
            key={country}
            value={country}
          >
            {country}
          </option>
        ))}
      </select>

      <div className="radar-toolbar-stats">
        <ToolbarStat
          label="Flights"
          value={statistics.activeFlights}
        />

        <ToolbarStat
          label="Speed"
          value={`${(
            statistics.averageVelocity * 3.6
          ).toFixed(0)} km/h`}
        />

        <ToolbarStat
          label="Altitude"
          value={`${statistics.averageAltitude.toFixed(
            0
          )} m`}
        />

        <ToolbarStat
          label="Ground"
          value={statistics.onGround}
        />
      </div>

      <div className="radar-toolbar-actions">
        <div className="radar-toolbar-meta">
          <span>
            Haritada:{" "}
            <strong>
              {visibleFlightCount}
            </strong>
          </span>

          <span>
            Güncelleme:{" "}
            <strong>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString(
                    "tr-TR"
                  )
                : "-"}
            </strong>
          </span>
        </div>

        <button
          type="button"
          className="radar-refresh-button"
          onClick={onRefresh}
          disabled={loading}
        >
          <span>↻</span>

          {loading
            ? "Yükleniyor"
            : "Yenile"}
        </button>
      </div>
    </header>
  );
}

function ToolbarStat({ label, value }) {
  return (
    <div className="radar-toolbar-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default TopBar;