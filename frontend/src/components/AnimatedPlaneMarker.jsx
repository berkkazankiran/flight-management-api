import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Marker,
  Popup,
  Tooltip,
} from "react-leaflet";

const ANIMATION_DURATION_MS = 28000;

const MAX_ANIMATED_DISTANCE_DEGREES = 4;

function AnimatedPlaneMarker({
  flight,
  icon,
  tooltip,
  children,
}) {
  const latitude = Number(flight.latitude);
  const longitude = Number(flight.longitude);

  const isValidPosition =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const initialPosition = isValidPosition
    ? [latitude, longitude]
    : [0, 0];

  const [animatedPosition, setAnimatedPosition] =
    useState(initialPosition);

  const currentPositionRef =
    useRef(initialPosition);

  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isValidPosition) {
      return undefined;
    }

    const startPosition = [
      currentPositionRef.current[0],
      currentPositionRef.current[1],
    ];

    const targetPosition = [
      latitude,
      longitude,
    ];

    const latitudeDifference =
      targetPosition[0] - startPosition[0];

    const longitudeDifference =
      targetPosition[1] - startPosition[1];

    const totalDifference =
      Math.abs(latitudeDifference) +
      Math.abs(longitudeDifference);

    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );
    }

    if (
      totalDifference === 0 ||
      totalDifference >
        MAX_ANIMATED_DISTANCE_DEGREES
    ) {
      currentPositionRef.current =
        targetPosition;

      setAnimatedPosition(targetPosition);

      return undefined;
    }

    const startedAt = performance.now();

    function animate(currentTime) {
      const elapsed =
        currentTime - startedAt;

      const progress = Math.min(
        elapsed / ANIMATION_DURATION_MS,
        1
      );

      const nextPosition = [
        startPosition[0] +
          latitudeDifference * progress,

        startPosition[1] +
          longitudeDifference * progress,
      ];

      currentPositionRef.current =
        nextPosition;

      setAnimatedPosition(nextPosition);

      if (progress < 1) {
        animationFrameRef.current =
          requestAnimationFrame(animate);
      } else {
        currentPositionRef.current =
          targetPosition;

        setAnimatedPosition(targetPosition);

        animationFrameRef.current = null;
      }
    }

    animationFrameRef.current =
      requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }
    };
  }, [
    latitude,
    longitude,
    isValidPosition,
  ]);

  if (!isValidPosition) {
    return null;
  }

  return (
    <Marker
      position={animatedPosition}
      icon={icon}
    >
      {tooltip && (
        <Tooltip
          direction="top"
          offset={[0, -14]}
          opacity={1}
          className="flight-hover-tooltip"
        >
          {tooltip}
        </Tooltip>
      )}

      {children && (
        <Popup>{children}</Popup>
      )}
    </Marker>
  );
}

export default AnimatedPlaneMarker;