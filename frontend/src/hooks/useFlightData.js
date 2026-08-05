import { useMemo } from "react";

function useFlightData({
  flights,
  searchText,
  selectedCountry,
  mapBounds,
  mapZoom,
  trackedFlight,
}) {
  const countries = useMemo(() => {
    return [
      ...new Set(
        flights
          .map(
            (flight) =>
              flight.origin_country
          )
          .filter(Boolean)
      ),
    ].sort();
  }, [flights]);

  const filteredFlights = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

    return flights.filter((flight) => {
      const matchesSearch =
        !normalizedSearch ||
        flight.callsign
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        flight.icao24
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesCountry =
        selectedCountry === "all" ||
        flight.origin_country ===
          selectedCountry;

      return (
        matchesSearch &&
        matchesCountry
      );
    });
  }, [
    flights,
    searchText,
    selectedCountry,
  ]);

  const visibleFlights = useMemo(() => {
    if (!mapBounds) {
      return [];
    }

    const flightsInsideMap =
      filteredFlights.filter((flight) => {
        const latitude = Number(
          flight.latitude
        );

        const longitude = Number(
          flight.longitude
        );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return false;
        }

        return mapBounds.contains([
          latitude,
          longitude,
        ]);
      });

    let markerLimit;

    if (mapZoom <= 4) {
      markerLimit = 100;
    } else if (mapZoom <= 6) {
      markerLimit = 250;
    } else if (mapZoom <= 8) {
      markerLimit = 500;
    } else if (mapZoom <= 10) {
      markerLimit = 1000;
    } else {
      markerLimit =
        flightsInsideMap.length;
    }

    return flightsInsideMap.slice(
      0,
      markerLimit
    );
  }, [
    filteredFlights,
    mapBounds,
    mapZoom,
  ]);

  const trackedPlane = useMemo(() => {
    if (!trackedFlight) {
      return null;
    }

    return (
      flights.find(
        (flight) =>
          flight.icao24?.toLowerCase() ===
          trackedFlight.toLowerCase()
      ) ?? null
    );
  }, [flights, trackedFlight]);

  const statistics = useMemo(() => {
    const flyingFlights =
      flights.filter(
        (flight) =>
          flight.on_ground === false
      );

    const velocities = flights
      .map(
        (flight) =>
          flight.velocity_m_s
      )
      .filter(
        (value) =>
          typeof value === "number"
      );

    const altitudes = flights
      .map(
        (flight) =>
          flight.barometric_altitude_m
      )
      .filter(
        (value) =>
          typeof value === "number"
      );

    const averageVelocity =
      velocities.length > 0
        ? velocities.reduce(
            (total, value) =>
              total + value,
            0
          ) / velocities.length
        : 0;

    const averageAltitude =
      altitudes.length > 0
        ? altitudes.reduce(
            (total, value) =>
              total + value,
            0
          ) / altitudes.length
        : 0;

    return {
      activeFlights:
        flyingFlights.length,

      onGround: flights.filter(
        (flight) =>
          flight.on_ground === true
      ).length,

      averageVelocity,
      averageAltitude,
    };
  }, [flights]);

  return {
    countries,
    filteredFlights,
    visibleFlights,
    trackedPlane,
    statistics,
  };
}

export default useFlightData;