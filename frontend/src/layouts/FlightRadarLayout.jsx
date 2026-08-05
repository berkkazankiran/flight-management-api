import "./FlightRadarLayout.css";

function FlightRadarLayout({
  topbar,
  map,
  panel,
}) {
  return (
    <main className="radar-app">
      {topbar}

      <div className="radar-map-shell">
        <div className="radar-map-area">
          {map}
        </div>

        {panel && (
          <div className="radar-panel-area">
            {panel}
          </div>
        )}
      </div>
    </main>
  );
}

export default FlightRadarLayout;