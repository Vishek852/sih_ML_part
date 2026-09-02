import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Small map for the booking confirmation screen: shows the customer's
 * chosen location and the assigned worker's position (static by default;
 * pass a `worker` whose lng/lat come from useWorkerTracking once live
 * tracking is available, and it updates automatically).
 *
 * Props:
 *  - mapboxToken: string
 *  - customerLocation: { lng, lat }
 *  - worker?: { lng, lat, name }
 */
export default function BookingMapPreview({ mapboxToken, customerLocation, worker, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const workerMarkerRef = useRef(null);

  // --- Init map once ---
  useEffect(() => {
    if (!mapboxToken || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [customerLocation.lng, customerLocation.lat],
      zoom: 13,
      scrollZoom: false,
    });
    mapRef.current = map;

    new mapboxgl.Marker({ color: "#1f6f5c" })
      .setLngLat([customerLocation.lng, customerLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 16 }).setText("Service location"))
      .addTo(map);

    if (worker) {
      workerMarkerRef.current = new mapboxgl.Marker({ color: "#f59e0b" })
        .setLngLat([worker.lng, worker.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(worker.name))
        .addTo(map);
    }

    map.once("load", () => {
      if (worker) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([customerLocation.lng, customerLocation.lat]);
        bounds.extend([worker.lng, worker.lat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
      }
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // --- Move the worker marker smoothly if new coordinates arrive (e.g. from live tracking) ---
  useEffect(() => {
    if (!worker || !mapRef.current) return;
    if (workerMarkerRef.current) {
      workerMarkerRef.current.setLngLat([worker.lng, worker.lat]);
    } else {
      workerMarkerRef.current = new mapboxgl.Marker({ color: "#f59e0b" })
        .setLngLat([worker.lng, worker.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(worker.name))
        .addTo(mapRef.current);
    }
  }, [worker?.lng, worker?.lat]);

  return (
    <div className={`h-56 w-full overflow-hidden rounded-lg border border-slate-200 ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
