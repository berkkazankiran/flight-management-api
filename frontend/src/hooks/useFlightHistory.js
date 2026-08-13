import { useEffect, useState } from "react";

import { getFlightHistory } from "../services/flightApi";

function useFlightHistory(trackedFlight) {
  const [flightHistory, setFlightHistory] =
    useState([]);

  const [
    estimatedDepartureAirport,
    setEstimatedDepartureAirport,
  ] = useState(null);

  const [
    estimatedDestinationAirport,
    setEstimatedDestinationAirport,
  ] = useState(null);

  const [historyError, setHistoryError] =
    useState("");

  useEffect(() => {
    if (!trackedFlight) {
      return undefined;
    }

    let isActive = true;

    async function fetchHistory() {
      try {
        setHistoryError("");

        const result = await getFlightHistory(
          trackedFlight
        );

        if (!isActive) {
          return;
        }

        setFlightHistory(result.history);

        setEstimatedDepartureAirport(
          result.estimatedDepartureAirport
        );

        setEstimatedDestinationAirport(
          result.estimatedDestinationAirport
        );
      } catch (requestError) {
        console.error(
          "Uçuş geçmişi alınamadı:",
          requestError
        );

        if (!isActive) {
          return;
        }

        setHistoryError(
          "Uçağın geçmiş rotası alınamadı."
        );

        setFlightHistory([]);
        setEstimatedDepartureAirport(null);
        setEstimatedDestinationAirport(null);
      }
    }

    fetchHistory();

    const historyIntervalId =
      window.setInterval(
        fetchHistory,
        15000
      );

    return () => {
      isActive = false;

      window.clearInterval(
        historyIntervalId
      );
    };
  }, [trackedFlight]);

  return {
    flightHistory,
    estimatedDepartureAirport,
    estimatedDestinationAirport,
    historyError,
  };
}

export default useFlightHistory;