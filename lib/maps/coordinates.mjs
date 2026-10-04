// Coordinates are stored longitude first for MongoDB's rectangular map queries.
export function mapPoint(latitude, longitude) {
  if (latitude == null || longitude == null || String(latitude).trim() === '' || String(longitude).trim() === '') return undefined;
  const lat = Number(String(latitude).trim()), lng = Number(String(longitude).trim());
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? [lng, lat] : undefined;
}
