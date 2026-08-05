import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

function MapViewportController({
  onBoundsChange,
}) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(
        map.getBounds(),
        map.getZoom()
      );
    },

    zoomend: () => {
      onBoundsChange(
        map.getBounds(),
        map.getZoom()
      );
    },
  });

  useEffect(() => {
    onBoundsChange(
      map.getBounds(),
      map.getZoom()
    );
  }, [map, onBoundsChange]);

  return null;
}

export default MapViewportController;