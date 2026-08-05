import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const LIVE_FLIGHTS_API_URL =
  `${API_BASE_URL}/api/flights/live`;

const FLIGHT_HISTORY_API_URL =
  `${API_BASE_URL}/api/flights/history`;

function createBoundsParams(bounds) {
  if (!bounds) {
    return {};
  }

  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return {
    lamin: Math.max(-90, southWest.lat),
    lomin: Math.max(-180, southWest.lng),
    lamax: Math.min(90, northEast.lat),
    lomax: Math.min(180, northEast.lng),
  };
}

export async function getLiveFlights(bounds) {
  const response = await axios.get(
    LIVE_FLIGHTS_API_URL,
    {
      params: createBoundsParams(bounds),
    }
  );

  return {
    flights: response.data.flights ?? [],
    time: response.data.time ?? null,
  };
}

export async function getFlightHistory(icao24) {
  if (!icao24) {
    throw new Error("ICAO24 değeri gereklidir.");
  }

  const normalizedIcao24 =
    icao24.trim().toLowerCase();

  const response = await axios.get(
    `${FLIGHT_HISTORY_API_URL}/${encodeURIComponent(
      normalizedIcao24
    )}`
  );

  return {
    history: response.data.history ?? [],

    estimatedDepartureAirport:
      response.data
        .estimated_departure_airport ?? null,

    estimatedDestinationAirport:
      response.data
        .estimated_destination_airport ?? null,
  };
}