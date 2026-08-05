import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

function useFlightSocket({
  setFlights,
  setLastUpdated,
}) {
  const pendingUpdatesRef = useRef(new Map());
  const updateTimerRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    function flushFlightUpdates() {
      const pendingUpdates =
        pendingUpdatesRef.current;

      if (pendingUpdates.size === 0) {
        updateTimerRef.current = null;
        return;
      }

      const updates = new Map(pendingUpdates);

      pendingUpdates.clear();
      updateTimerRef.current = null;

      setFlights((currentFlights) => {
        const flightMap = new Map(
          currentFlights.map((flight) => [
            flight.icao24?.toLowerCase(),
            flight,
          ])
        );

        updates.forEach(
          (updatedFlight, icao24) => {
            const existingFlight =
              flightMap.get(icao24);

            flightMap.set(icao24, {
              ...existingFlight,
              ...updatedFlight,
            });
          }
        );

        return Array.from(flightMap.values());
      });

      setLastUpdated(new Date());
    }

    function handleConnect() {
      console.log(
        "Socket.IO bağlandı:",
        socket.id
      );
    }

    function handleDisconnect() {
      console.log(
        "Socket.IO bağlantısı kesildi"
      );
    }

    function handleConnectError(error) {
      console.error(
        "Socket.IO bağlantı hatası:",
        error
      );
    }

    function handleFlightUpdate(updatedFlight) {
      const icao24 =
        updatedFlight.icao24?.toLowerCase();

      if (!icao24) {
        return;
      }

      pendingUpdatesRef.current.set(
        icao24,
        updatedFlight
      );

      if (!updateTimerRef.current) {
        updateTimerRef.current =
          window.setTimeout(
            flushFlightUpdates,
            250
          );
      }
    }

    socket.on("connect", handleConnect);
    socket.on(
      "disconnect",
      handleDisconnect
    );
    socket.on(
      "connect_error",
      handleConnectError
    );
    socket.on(
      "flight_update",
      handleFlightUpdate
    );

    return () => {
      socket.off("connect", handleConnect);
      socket.off(
        "disconnect",
        handleDisconnect
      );
      socket.off(
        "connect_error",
        handleConnectError
      );
      socket.off(
        "flight_update",
        handleFlightUpdate
      );

      socket.disconnect();

      if (updateTimerRef.current) {
        window.clearTimeout(
          updateTimerRef.current
        );
      }

      pendingUpdatesRef.current.clear();
    };
  }, [setFlights, setLastUpdated]);
}

export default useFlightSocket;