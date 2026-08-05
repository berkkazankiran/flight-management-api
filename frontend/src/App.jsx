  import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

  import { getLiveFlights } from "./services/flightApi";
  import "leaflet/dist/leaflet.css";
  import FlightDetailPanel from "./components/FlightDetailPanel";
  import FlightMap from "./components/FlightMap";
  import FlightRadarLayout from "./layouts/FlightRadarLayout";
  import TopBar from "./components/TopBar";
  import useFlightSocket from "./hooks/useFlightSocket";
  import useFlightData from "./hooks/useFlightData";
  import useFlightHistory from "./hooks/useFlightHistory";
  import { createPlaneIcon } from "./utils/planeIcon";

  function App() {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchText, setSearchText] = useState("");
    const [selectedCountry, setSelectedCountry] = useState("all");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [trackedFlight, setTrackedFlight] = useState(null);
    const {
      flightHistory,
      estimatedDepartureAirport,
      estimatedDestinationAirport,
      historyError,
} = useFlightHistory(trackedFlight);
    useFlightSocket({
  setFlights,
  setLastUpdated,
});
    const [mapBounds, setMapBounds] = useState(null);
    const handleBoundsChange = useCallback((bounds, zoom) => {
      setMapBounds(bounds);
      setMapZoom(zoom);
    }, []);
    const [mapZoom, setMapZoom] = useState(6);
    const [flightTrail, setFlightTrail] = useState([]);
    const lastTrailPositionRef = useRef(null);
    const fetchFlights = async (
  bounds = mapBounds
) => {
  try {
    setError("");
    setLoading(true);

    const result = await getLiveFlights(bounds);

    setFlights(result.flights);
    setLastUpdated(new Date());
  } catch (requestError) {
    console.error(
      "Uçuş verisi alınamadı:",
      requestError.response?.data ??
        requestError.message
    );

    setError(
      requestError.response?.data?.message ??
        "Uçuş verileri alınamadı."
    );
  } finally {
    setLoading(false);
  }
};

    
  useEffect(() => {
  if (!mapBounds) {
    fetchFlights(null);
    return;
  }

  const timeoutId = window.setTimeout(() => {
    fetchFlights(mapBounds);
  }, 500);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [mapBounds]);
    
  const {
  countries,
  visibleFlights,
  trackedPlane,
  statistics,
} = useFlightData({
  flights,
  searchText,
  selectedCountry,
  mapBounds,
  mapZoom,
  trackedFlight,
});
        
   return (
  <FlightRadarLayout
    topbar={
      <TopBar
        statistics={statistics}
        searchText={searchText}
        onSearchChange={setSearchText}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        visibleFlightCount={
          visibleFlights.length
        }
        onRefresh={() =>
          fetchFlights(mapBounds)
        }
        lastUpdated={lastUpdated}
        loading={loading}
      />
    }
    map={
      <FlightMap
  flights={flights}
  visibleFlights={visibleFlights}
  trackedFlight={trackedFlight}
  flightHistory={flightHistory}
  estimatedDepartureAirport={
    estimatedDepartureAirport
  }
  estimatedDestinationAirport={
    estimatedDestinationAirport
  }
  createPlaneIcon={createPlaneIcon}
  onBoundsChange={
    handleBoundsChange
  }
  onTrackFlight={
    setTrackedFlight
  }
  lastUpdated={lastUpdated}
/>
    }
    panel={
      trackedPlane ? (
        <FlightDetailPanel
          key={trackedPlane.icao24}
          trackedPlane={trackedPlane}
          flightHistory={flightHistory}
          estimatedDepartureAirport={
            estimatedDepartureAirport
          }
          estimatedDestinationAirport={
            estimatedDestinationAirport
          }
          onStopTracking={() =>
            setTrackedFlight(null)
          }
        />
      ) : null
    }
  />
);
}
export default App;