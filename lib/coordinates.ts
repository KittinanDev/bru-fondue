export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

// Bounding box calibrated for Buriram Rajabhat University campus map (campus-map.png)
export const CAMPUS_MAP_BOUNDS = {
  south: 14.9815,
  west: 103.0895,
  north: 15.0015,
  east: 103.1125,
};

export const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function coordinatesToPercent(lat: number, lng: number) {
  const left =
    clamp((lng - CAMPUS_MAP_BOUNDS.west) / (CAMPUS_MAP_BOUNDS.east - CAMPUS_MAP_BOUNDS.west)) *
    100;
  const top =
    clamp((CAMPUS_MAP_BOUNDS.north - lat) / (CAMPUS_MAP_BOUNDS.north - CAMPUS_MAP_BOUNDS.south)) *
    100;
  return { left, top };
}

export function percentToCoordinates(percentX: number, percentY: number) {
  const x = clamp(percentX);
  const y = clamp(percentY);
  const lat =
    CAMPUS_MAP_BOUNDS.north - y * (CAMPUS_MAP_BOUNDS.north - CAMPUS_MAP_BOUNDS.south);
  const lng =
    CAMPUS_MAP_BOUNDS.west + x * (CAMPUS_MAP_BOUNDS.east - CAMPUS_MAP_BOUNDS.west);
  return { lat, lng };
}
