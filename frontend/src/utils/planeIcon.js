import L from "leaflet";

const planeIconCache = new Map();

export function createPlaneIcon(
  heading = 0,
  onGround = false,
  isTracked = false,
  altitude = null
) {
  const numericHeading = Number(heading) || 0;

  const roundedHeading =
    Math.round(numericHeading / 5) * 5;

  const planeColor = getPlaneColor({
    altitude,
    onGround,
    isTracked,
  });

  const state = isTracked
    ? "tracked"
    : onGround
      ? "ground"
      : "airborne";

  const cacheKey = [
    roundedHeading,
    state,
    planeColor,
  ].join("-");

  if (planeIconCache.has(cacheKey)) {
    return planeIconCache.get(cacheKey);
  }

  const iconSize = isTracked ? 42 : 34;
  const anchor = iconSize / 2;

  const icon = L.divIcon({
    className: `plane-marker ${state}`,
    html: `
      <div class="plane-marker-container">
        ${
          isTracked
            ? '<span class="plane-pulse"></span>'
            : ""
        }

        <div
          class="plane-icon"
          style="
            transform: rotate(${roundedHeading - 90}deg);
            color: ${planeColor};
          "
        >
          ✈
        </div>
      </div>
    `,
    iconSize: [iconSize, iconSize],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -anchor],
  });

  planeIconCache.set(cacheKey, icon);

  return icon;
}

function getPlaneColor({
  altitude,
  onGround,
  isTracked,
}) {
  if (isTracked) {
    return "#ff2d55";
  }

  if (onGround) {
    return "#f59e0b";
  }

  const normalizedAltitude = Number(altitude);

  if (!Number.isFinite(normalizedAltitude)) {
    return "#22d3ee";
  }

  if (normalizedAltitude < 1000) {
    return "#22c55e";
  }

  if (normalizedAltitude < 6000) {
    return "#facc15";
  }

  if (normalizedAltitude < 11000) {
    return "#22d3ee";
  }

  return "#8b5cf6";
}