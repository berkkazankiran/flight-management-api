import {
  MapContainer,
  Polyline,
  Marker,
  TileLayer,
} from "react-leaflet";

import AnimatedPlaneMarker from "./AnimatedPlaneMarker";
import MapController from "./MapController";
import MapViewportController from "./MapViewportController";
import "./FlightMap.css";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import L from "leaflet";
import FlightTrail from "./FlightTrail";

const departureAirportIcon = createAirportIcon({
  type: "departure",
  code: "DEP",
});

const destinationAirportIcon = createAirportIcon({
  type: "destination",
  code: "ARR",
});

function createAirportIcon({
  type,
  code,
}) {
  return L.divIcon({
    className: "airport-marker-wrapper",
    html: `
      <div class="airport-pin ${type}">
        <span class="airport-pin-dot"></span>
        <span class="airport-pin-label">${code}</span>
      </div>
    `,
    iconSize: [38, 24],
    iconAnchor: [19, 12],
    popupAnchor: [0, -14],
  });
}

function FlightMap({
  flights,
  visibleFlights,
  trackedFlight,
  flightHistory,
  createPlaneIcon,
  estimatedDestinationAirport,
  estimatedDepartureAirport,
  onBoundsChange,
  onTrackFlight,
  lastUpdated,
}) {

  const trackedPlane = flights.find(
    (flight) =>
      flight.icao24?.toLowerCase() ===
      trackedFlight?.toLowerCase()
);

  const [mapTheme, setMapTheme] = useState("dark");
   return(
    <div className="flight-map-wrapper">
    <MapContainer
      className={`flight-map ${mapTheme === "dark" ? "dark-flight-map" : ""}`}
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={18}
      worldCopyJump={false}
      maxBounds={[
        [-90, -180],
        [90, 180],
      ]}
      style={{
        height: "100%",
        width: "100%",
      }}
    >
     <TileLayer
  attribution="&copy; OpenStreetMap contributors &copy; CARTO"
  url={
    mapTheme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
  }
  subdomains="abcd"
/>
      <MapViewportController
        onBoundsChange={onBoundsChange}
      />

      <MapController
        trackedFlight={trackedFlight}
        flights={flights}
      />

      {isValidAirport(
  estimatedDepartureAirport
) && (
  <Marker
    position={[
      Number(
        estimatedDepartureAirport.latitude
      ),
      Number(
        estimatedDepartureAirport.longitude
      ),
    ]}
    icon={departureAirportIcon}
  >
    <AirportPopup
      airport={
        estimatedDepartureAirport
      }
      type="Kalkış"
    />
  </Marker>
)}

{isValidAirport(
  estimatedDestinationAirport
) && (
  <Marker
    position={[
      Number(
        estimatedDestinationAirport.latitude
      ),
      Number(
        estimatedDestinationAirport.longitude
      ),
    ]}
    icon={destinationAirportIcon}
  >
    <AirportPopup
      airport={
        estimatedDestinationAirport
      }
      type="Varış"
    />
  </Marker>
)}

      <FlightTrail
  flightHistory={flightHistory}
  currentFlight={trackedPlane}
/>

      {estimatedDestinationAirport?.route_points?.length >= 2 && (
  <Polyline
    positions={estimatedDestinationAirport.route_points
      .map((point) => [
        Number(point[0]),
        Number(point[1]),
      ])
      .filter(
        ([latitude, longitude]) =>
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
      )}
    pathOptions={{
      color: "#f59e0b",
      weight: 3,
      opacity: 0.9,
      dashArray: "12 10",
      lineCap: "round",
      lineJoin: "round",
    }}
  />
)}

     {visibleFlights.map((flight) => {
  const isTracked =
    trackedFlight?.toLowerCase() ===
    flight.icao24?.toLowerCase();

  return (
    <AnimatedPlaneMarker
      key={flight.icao24}
      flight={flight}
     icon={createPlaneIcon(
       flight.heading_deg ?? flight.heading,
       flight.on_ground,
       isTracked,
       flight.barometric_altitude_m ??
       flight.altitude
      )}
      tooltip={
        <FlightTooltip flight={flight} />
      }
    >
      <div className="popup-content compact-popup">
        <div className="popup-header">
          <div>
            <h3>
              {flight.callsign?.trim() ||
                "Bilinmeyen uçuş"}
            </h3>

            <span className="popup-icao">
              {flight.icao24?.toUpperCase() ||
                "-"}
            </span>

            <span className="popup-country">
              {flight.origin_country ||
                flight.country ||
                "Ülke bilinmiyor"}
            </span>
          </div>

          <span
            className={
              flight.on_ground
                ? "popup-status ground"
                : "popup-status airborne"
            }
          >
            {flight.on_ground
              ? "Yerde"
              : "Havada"}
          </span>
        </div>

        <div className="popup-metrics">
          <PopupMetric
            label="İrtifa"
            value={
              flight.barometric_altitude_m != null
                ? `${Math.round(
                    flight.barometric_altitude_m
                  )} m`
                : "-"
            }
          />

          <PopupMetric
            label="Hız"
            value={
              flight.velocity_m_s != null
                ? `${Math.round(
                    flight.velocity_m_s * 3.6
                  )} km/h`
                : "-"
            }
          />

          <PopupMetric
            label="Yön"
            value={
              flight.heading_deg != null
                ? `${Math.round(
                    flight.heading_deg
                  )}°`
                : "-"
            }
          />
        </div>

        <button
          type="button"
          className="track-button"
          onClick={() =>
            onTrackFlight(flight.icao24)
          }
        >
          {isTracked
            ? "✓ Takip Ediliyor"
            : "Uçağı Takip Et"}
        </button>
      </div>
    </AnimatedPlaneMarker>
  );
})}
        </MapContainer>

<MapThemeToggle
  mapTheme={mapTheme}
  onThemeChange={setMapTheme}
/>
    <LiveMapCard
      visibleFlightCount={
        visibleFlights.length
      }
      trackedFlight={trackedFlight}
      lastUpdated={lastUpdated}
    />
  </div>
);
}

function PopupMetric({ label, value }) {
  return (
    <div className="popup-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlightTooltip({ flight }) {
  const callsign =
    flight.callsign?.trim() ||
    "Bilinmeyen uçuş";

  const velocity =
    flight.velocity_m_s ??
    flight.velocity;

  const altitude =
    flight.barometric_altitude_m ??
    flight.altitude;

  return (
    <div className="flight-tooltip-content">
      <div className="flight-tooltip-header">
        <strong>{callsign}</strong>

        <span
          className={
            flight.on_ground
              ? "tooltip-state ground"
              : "tooltip-state airborne"
          }
        >
          {flight.on_ground
            ? "Yerde"
            : "Havada"}
        </span>
      </div>

      <span className="flight-tooltip-aircraft">
        {flight.icao24?.toUpperCase()}
      </span>

      <div className="flight-tooltip-metrics">
        <span>
          {altitude != null
            ? `${Math.round(altitude)} m`
            : "-"}
        </span>

        <span>
          {velocity != null
            ? `${Math.round(
                velocity * 3.6
              )} km/h`
            : "-"}
        </span>
      </div>
    </div>
  );
}

function LiveMapCard({
  visibleFlightCount,
  trackedFlight,
  lastUpdated,
}) {
  return (
    <div className="live-map-card">
      <div className="live-map-heading">
        <span className="live-map-dot" />

        <strong>LIVE</strong>
      </div>

      <div className="live-map-row">
        <span>Visible flights</span>
        <strong>
          {visibleFlightCount}
        </strong>
      </div>

      <div className="live-map-row">
        <span>Tracked</span>
        <strong>
          {trackedFlight ? "1" : "0"}
        </strong>
      </div>

      <div className="live-map-row">
        <span>Updated</span>
        <strong>
          {lastUpdated
            ? lastUpdated.toLocaleTimeString(
                "tr-TR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )
            : "-"}
        </strong>
      </div>
    </div>
  );
}

function MapThemeToggle({
  mapTheme,
  onThemeChange,
}) {
  const isDark = mapTheme === "dark";

  return (
    <div className="map-theme-toggle">
      <button
        type="button"
        className={
          !isDark
            ? "theme-option active"
            : "theme-option"
        }
        onClick={() =>
          onThemeChange("light")
        }
        title="Açık tema"
        aria-label="Açık harita temasını seç"
      >
        <Sun size={16} strokeWidth={2} />
      </button>

      <button
        type="button"
        className={
          isDark
            ? "theme-option active"
            : "theme-option"
        }
        onClick={() =>
          onThemeChange("dark")
        }
        title="Koyu tema"
        aria-label="Koyu harita temasını seç"
      >
        <Moon size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function AirportPopup({
  airport,
  type,
}) {
  const code =
    airport.iata_code ||
    airport.icao_code ||
    airport.ident ||
    "-";

  const city =
    airport.city ||
    airport.municipality ||
    "-";

  return (
    <div className="airport-popup">
      <span className="airport-popup-type">
        {type} havalimanı
      </span>

      <strong className="airport-popup-code">
        {code}
      </strong>

      <span className="airport-popup-name">
        {airport.name || "-"}
      </span>

      <span className="airport-popup-city">
        {city}
      </span>
    </div>
  );
}

function isValidAirport(airport) {
  if (!airport) {
    return false;
  }

  const latitude = Number(
    airport.latitude
  );

  const longitude = Number(
    airport.longitude
  );

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

export default FlightMap;