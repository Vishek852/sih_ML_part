// src/lib/mapboxClient.js
const MAPBOX_GEOCODING_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

/**
 * Forward geocode: turn a partial address string into ranked suggestions.
 * Used for the address-autocomplete input.
 */
export async function forwardGeocode(query, token, { proximity, country = "in", limit = 5 } = {}) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    access_token: token,
    autocomplete: "true",
    limit: String(limit),
    country,
  });
  if (proximity) params.set("proximity", `${proximity.lng},${proximity.lat}`);

  const url = `${MAPBOX_GEOCODING_URL}/${encodeURIComponent(query)}.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);
  const data = await res.json();

  return (data.features || []).map((f) => ({
    id: f.id,
    placeName: f.place_name,
    lng: f.center[0],
    lat: f.center[1],
  }));
}

/**
 * Reverse geocode: turn coordinates into a human-readable address.
 * Used when the pin is dragged or the map is clicked.
 */
export async function reverseGeocode(lng, lat, token) {
  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
  });
  const url = `${MAPBOX_GEOCODING_URL}/${lng},${lat}.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
  const data = await res.json();
  return data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
