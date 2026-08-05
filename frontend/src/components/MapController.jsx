import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

function MapController({
  trackedFlight,
  flights,
}) {
  const map = useMap();
  const previousTrackedFlightRef =
    useRef(null);

  useEffect(() => {
    if (!trackedFlight) {
      previousTrackedFlightRef.current =
        null;
      return;
    }

    if (
      previousTrackedFlightRef.current ===
      trackedFlight
    ) {
      return;
    }

    const trackedPlane = flights.find(
      (flight) =>
        flight.icao24?.toLowerCase() ===
        trackedFlight.toLowerCase()
    );

    if (!trackedPlane) {
      return;
    }

    const latitude = Number(
      trackedPlane.latitude
    );

    const longitude = Number(
      trackedPlane.longitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    previousTrackedFlightRef.current =
      trackedFlight;

    map.flyTo(
      [latitude, longitude],
      Math.max(map.getZoom(), 7),
      {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.18,
      }
    );
  }, [
    trackedFlight,
    flights,
    map,
  ]);

  return null;
}

export default MapController;