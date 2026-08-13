import { useEffect, useMemo, useState } from "react";

import AircraftCard from "./AircraftCard";
import FlightCard from "./FlightCard";
import PositionCard from "./PositionCard";
import RouteCard from "./RouteCard";

import "./FlightDetailPanel.css";

const EARTH_RADIUS_KM = 6371;

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:5000";

function FlightDetailPanel({
  trackedPlane,
  flightHistory,
  estimatedDepartureAirport,
  estimatedDestinationAirport,
  onStopTracking,
}) {
  const [aircraftInformation, setAircraftInformation] =
    useState(null);

  const [aircraftLoading, setAircraftLoading] =
    useState(false);

  const [aircraftNotFound, setAircraftNotFound] =
    useState(false);

  useEffect(() => {
    const icao24 = trackedPlane?.icao24;

    if (!icao24) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadAircraftInformation() {
      setAircraftLoading(true);
      setAircraftInformation(null);
      setAircraftNotFound(false);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/aircraft/${encodeURIComponent(
            icao24.toLowerCase()
          )}`,
          {
            signal: controller.signal,
          }
        );

        if (response.status === 404) {
          setAircraftNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Aircraft API error: ${response.status}`
          );
        }

        const data = await response.json();

        if (
          data.status === "success" &&
          data.aircraft
        ) {
          setAircraftInformation(data.aircraft);
        } else {
          setAircraftNotFound(true);
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(
            "Uçak bilgileri alınamadı:",
            error
          );

          setAircraftNotFound(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setAircraftLoading(false);
        }
      }
    }

    loadAircraftInformation();

    return () => controller.abort();
  }, [trackedPlane?.icao24]);

  const metrics = useMemo(() => {
    if (!trackedPlane) {
      return null;
    }

    const altitude =
      trackedPlane.barometric_altitude_m ??
      trackedPlane.altitude;

    const velocity =
      trackedPlane.velocity_m_s ??
      trackedPlane.velocity;

    const heading =
      trackedPlane.heading_deg ??
      trackedPlane.heading;

    const remainingDistanceKm =
      calculateRemainingDistance(
        trackedPlane,
        estimatedDestinationAirport
      );

    const estimatedArrivalMinutes =
      calculateEstimatedArrivalMinutes(
        remainingDistanceKm,
        velocity
      );

    return {
      altitude,
      velocity,
      heading,
      remainingDistanceKm,
      estimatedArrivalMinutes,
    };
  }, [
    trackedPlane,
    estimatedDestinationAirport,
  ]);

  if (!trackedPlane || !metrics) {
    return null;
  }

  const callsign =
    trackedPlane.callsign?.trim() ||
    "Bilinmeyen uçuş";

  return (
    <aside className="flight-detail-panel">
      <header className="flight-panel-header">
        <div className="flight-panel-heading">
          <span className="flight-panel-plane">
            ✈
          </span>

          <div>
            <p>Takip edilen uçuş</p>
            <h2>{callsign}</h2>
          </div>
        </div>

        <button
          type="button"
          className="flight-panel-close"
          onClick={onStopTracking}
          aria-label="Uçuş panelini kapat"
        >
          ×
        </button>
      </header>

      <div className="flight-panel-status-row">
        <span
          className={
            trackedPlane.on_ground
              ? "flight-status ground"
              : "flight-status airborne"
          }
        >
          <span className="flight-status-dot" />

          {trackedPlane.on_ground
            ? "Yerde"
            : "Havada"}
        </span>

        <span className="flight-panel-icao">
          {trackedPlane.icao24?.toUpperCase() ||
            "-"}
        </span>
      </div>

      <PanelSection
        icon="✈"
        title="Flight"
      >
        <FlightCard
          trackedPlane={trackedPlane}
          altitude={metrics.altitude}
          velocity={metrics.velocity}
          heading={metrics.heading}
        />
      </PanelSection>

      <PanelSection
        icon="🛩"
        title="Aircraft"
      >
        <AircraftCard
          aircraftInformation={
            aircraftInformation
          }
          aircraftLoading={aircraftLoading}
          aircraftNotFound={aircraftNotFound}
          trackedPlane={trackedPlane}
        />
      </PanelSection>

      <PanelSection
        icon="🧭"
        title="Route"
      >
        <RouteCard
          departureAirport={
            estimatedDepartureAirport
          }
          destinationAirport={
            estimatedDestinationAirport
          }
          remainingDistanceKm={
            metrics.remainingDistanceKm
          }
          estimatedArrivalMinutes={
            metrics.estimatedArrivalMinutes
          }
        />
      </PanelSection>

      <PanelSection
        icon="📍"
        title="Position"
      >
        <PositionCard
          trackedPlane={trackedPlane}
          flightHistory={flightHistory}
          heading={metrics.heading}
        />
      </PanelSection>

      <button
        type="button"
        className="stop-tracking-button"
        onClick={onStopTracking}
      >
        Takibi bırak
      </button>
    </aside>
  );
}

function PanelSection({
  icon,
  title,
  children,
}) {
  return (
    <section className="flight-panel-section">
      <div className="flight-panel-section-title">
        <span>{icon}</span>
        <h3>{title}</h3>
      </div>

      <div className="flight-panel-section-content">
        {children}
      </div>
    </section>
  );
}

function calculateRemainingDistance(
  trackedPlane,
  destinationAirport
) {
  const planeLatitude = Number(
    trackedPlane?.latitude
  );

  const planeLongitude = Number(
    trackedPlane?.longitude
  );

  const destinationLatitude = Number(
    destinationAirport?.latitude
  );

  const destinationLongitude = Number(
    destinationAirport?.longitude
  );

  if (
    !Number.isFinite(planeLatitude) ||
    !Number.isFinite(planeLongitude) ||
    !Number.isFinite(destinationLatitude) ||
    !Number.isFinite(destinationLongitude)
  ) {
    return null;
  }

  return calculateDistanceKm(
    planeLatitude,
    planeLongitude,
    destinationLatitude,
    destinationLongitude
  );
}

function calculateEstimatedArrivalMinutes(
  remainingDistanceKm,
  velocityMetersPerSecond
) {
  const velocity = Number(
    velocityMetersPerSecond
  );

  if (
    remainingDistanceKm == null ||
    !Number.isFinite(velocity) ||
    velocity <= 30
  ) {
    return null;
  }

  const velocityKmPerHour = velocity * 3.6;

  return (
    (remainingDistanceKm /
      velocityKmPerHour) *
    60
  );
}

function calculateDistanceKm(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {
  const toRadians = (value) =>
    (Number(value) * Math.PI) / 180;

  const lat1 = toRadians(latitude1);
  const lon1 = toRadians(longitude1);
  const lat2 = toRadians(latitude2);
  const lon2 = toRadians(longitude2);

  const latitudeDifference = lat2 - lat1;
  const longitudeDifference = lon2 - lon1;

  const haversineValue =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 *
    Math.atan2(
      Math.sqrt(haversineValue),
      Math.sqrt(1 - haversineValue)
    );

  return EARTH_RADIUS_KM * angularDistance;
}

export default FlightDetailPanel;
