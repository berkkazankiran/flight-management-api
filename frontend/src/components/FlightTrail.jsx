import { Polyline } from "react-leaflet";

const MAX_TRAIL_POINTS = 80;

function FlightTrail({
  flightHistory,
  currentFlight,
}) {
  const validPoints = flightHistory
    .map((point) => [
      Number(point.latitude),
      Number(point.longitude),
    ])
    .filter(
      ([latitude, longitude]) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
    )
    .slice(-MAX_TRAIL_POINTS);

  const currentLatitude = Number(
    currentFlight?.latitude
  );

  const currentLongitude = Number(
    currentFlight?.longitude
  );

  if (
    Number.isFinite(currentLatitude) &&
    Number.isFinite(currentLongitude)
  ) {
    const lastPoint =
      validPoints[validPoints.length - 1];

    const isDifferent =
      !lastPoint ||
      Math.abs(
        lastPoint[0] - currentLatitude
      ) > 0.000001 ||
      Math.abs(
        lastPoint[1] - currentLongitude
      ) > 0.000001;

    if (isDifferent) {
      validPoints.push([
        currentLatitude,
        currentLongitude,
      ]);
    }
  }

  if (validPoints.length < 2) {
    return null;
  }

  const segments = [];

  for (
    let index = 1;
    index < validPoints.length;
    index += 1
  ) {
    const progress =
      index / (validPoints.length - 1);

    segments.push({
      key: index,
      positions: [
        validPoints[index - 1],
        validPoints[index],
      ],
      weight: 1.5 + progress * 3,
      opacity: 0.15 + progress * 0.8,
    });
  }

  return (
    <>
      {segments.map((segment) => (
        <Polyline
          key={segment.key}
          positions={segment.positions}
          pathOptions={{
            color: "#22d3ee",
            weight: segment.weight,
            opacity: segment.opacity,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ))}

      {validPoints.length >= 8 && (
        <Polyline
          positions={validPoints.slice(-8)}
          pathOptions={{
            color: "#67e8f9",
            weight: 7,
            opacity: 0.13,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
    </>
  );
}

export default FlightTrail;