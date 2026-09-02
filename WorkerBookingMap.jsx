import { useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Map of nearby workers, synced with a side list of worker cards.
 * Clicking a marker selects the matching card (and scrolls it into view);
 * clicking a card flies the map to and highlights the matching marker.
 *
 * Props:
 *  - mapboxToken: string
 *  - center: { lng, lat }                — the customer's chosen location
 *  - workers: Array<{
 *      id, name, trade, rating, distanceKm?, lng, lat
 *    }>
 *  - selectedWorkerId: string | null
 *  - onSelectWorker: (id: string) => void
 */
export default function WorkerBookingMap({
  mapboxToken,
  center,
  workers = [],
  selectedWorkerId,
  onSelectWorker,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const cardRefs = useRef(new Map());

  // --- Init map once ---
  useEffect(() => {
    if (!mapboxToken || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 13,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    new mapboxgl.Marker({ color: "#1f6f5c" }).setLngLat([center.lng, center.lat]).addTo(map);

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // --- Keep worker markers in sync with the worker list ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenIds = new Set(workers.map((w) => w.id));
    for (const [id, marker] of markersRef.current) {
      if (!seenIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    workers.forEach((worker) => {
      const existing = markersRef.current.get(worker.id);
      if (existing) {
        existing.setLngLat([worker.lng, worker.lat]);
        return;
      }
      const el = document.createElement("div");
      el.style.cssText =
        "width:14px;height:14px;border-radius:9999px;background:#f59e0b;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);cursor:pointer;";

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([worker.lng, worker.lat]).addTo(map);

      el.addEventListener("click", () => onSelectWorker?.(worker.id));
      markersRef.current.set(worker.id, marker);
    });
  }, [workers, onSelectWorker]);

  // --- Selection sync: highlight marker, fly to it, scroll matching card into view ---
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.getElement();
      const isSelected = id === selectedWorkerId;
      el.style.background = isSelected ? "#1f6f5c" : "#f59e0b";
      el.style.width = isSelected ? "18px" : "14px";
      el.style.height = isSelected ? "18px" : "14px";
    }
    if (selectedWorkerId) {
      const marker = markersRef.current.get(selectedWorkerId);
      if (marker) mapRef.current?.flyTo({ center: marker.getLngLat(), zoom: 14.5 });
      cardRefs.current.get(selectedWorkerId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedWorkerId]);

  const sortedWorkers = useMemo(
    () => [...workers].sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)),
    [workers]
  );

  return (
    <div className={`flex flex-col gap-3 md:flex-row ${className}`}>
      <div className="h-80 w-full overflow-hidden rounded-lg border border-slate-200 md:h-[420px] md:w-2/3">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>

      <div className="w-full space-y-2 overflow-y-auto md:h-[420px] md:w-1/3">
        {sortedWorkers.length === 0 && (
          <p className="p-3 text-sm text-slate-500">No workers available in this area yet.</p>
        )}
        {sortedWorkers.map((worker) => {
          const isSelected = worker.id === selectedWorkerId;
          return (
            <button
              key={worker.id}
              ref={(el) => {
                if (el) cardRefs.current.set(worker.id, el);
                else cardRefs.current.delete(worker.id);
              }}
              type="button"
              onClick={() => onSelectWorker?.(worker.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                isSelected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{worker.name}</span>
                <span className="text-xs text-slate-500">★ {worker.rating.toFixed(1)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500">
                <span>{worker.trade}</span>
                {typeof worker.distanceKm === "number" && <span>{worker.distanceKm.toFixed(1)} km away</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
