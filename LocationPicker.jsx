import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { forwardGeocode, reverseGeocode } from "../lib/mapboxClient";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const DEFAULT_CENTER = { lng: 85.8245, lat: 20.2961 }; // Bhubaneswar fallback

/**
 * Address search + draggable pin for setting a booking/service location.
 *
 * Props:
 *  - mapboxToken: string (required)
 *  - initialLocation: { lng, lat }
 *  - initialAddress: string
 *  - onLocationChange: ({ lng, lat, address }) => void
 */
export default function LocationPicker({
  mapboxToken,
  initialLocation = DEFAULT_CENTER,
  initialAddress = "",
  onLocationChange,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [query, setQuery] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const suppressNextFetch = useRef(false);

  // --- Init map once ---
  useEffect(() => {
    if (!mapboxToken || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialLocation.lng, initialLocation.lat],
      zoom: 14,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    const marker = new mapboxgl.Marker({ draggable: true, color: "#1f6f5c" })
      .setLngLat([initialLocation.lng, initialLocation.lat])
      .addTo(map);
    markerRef.current = marker;

    marker.on("dragend", async () => {
      const { lng, lat } = marker.getLngLat();
      await syncAddressFromCoords(lng, lat);
    });

    map.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      marker.setLngLat([lng, lat]);
      await syncAddressFromCoords(lng, lat);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  const syncAddressFromCoords = useCallback(
    async (lng, lat) => {
      setIsGeocoding(true);
      setError(null);
      try {
        const address = await reverseGeocode(lng, lat, mapboxToken);
        suppressNextFetch.current = true;
        setQuery(address);
        onLocationChange?.({ lng, lat, address });
      } catch (err) {
        setError("Couldn't resolve an address for that point — you can still save these coordinates.");
        onLocationChange?.({ lng, lat, address: null });
      } finally {
        setIsGeocoding(false);
      }
    },
    [mapboxToken, onLocationChange]
  );

  // --- Autocomplete suggestions as the user types ---
  useEffect(() => {
    if (suppressNextFetch.current) {
      suppressNextFetch.current = false;
      return;
    }
    if (!debouncedQuery || debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const center = mapRef.current?.getCenter();
        const results = await forwardGeocode(debouncedQuery, mapboxToken, {
          proximity: center ? { lng: center.lng, lat: center.lat } : undefined,
        });
        if (!cancelled) setSuggestions(results);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, mapboxToken]);

  const selectSuggestion = (s) => {
    suppressNextFetch.current = true;
    setQuery(s.placeName);
    setShowSuggestions(false);
    setSuggestions([]);

    mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 15 });
    markerRef.current?.setLngLat([s.lng, s.lat]);
    onLocationChange?.({ lng: s.lng, lat: s.lat, address: s.placeName });
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative z-10">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          placeholder="Search for an address, area, or landmark"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                >
                  {s.placeName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 h-80 w-full overflow-hidden rounded-lg border border-slate-200">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        {isGeocoding ? "Resolving address…" : "Drag the pin or click the map to set the exact location."}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
