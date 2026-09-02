// BookingFlowExample.jsx — shows how the pieces fit together end to end.
// Not required at runtime; wire the individual components into your real
// booking screens however fits your app's routing/state.
import { useState } from "react";
import LocationPicker from "./components/LocationPicker";
import WorkerBookingMap from "./components/WorkerBookingMap";
import BookingMapPreview from "./components/BookingMapPreview";
import { useWorkerTracking } from "./hooks/useWorkerTracking";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Replace with a real API call to your backend's nearby-workers endpoint.
const MOCK_WORKERS = [
  { id: "w1", name: "Ramesh K.", trade: "Electrician", rating: 4.8, distanceKm: 1.2, lng: 85.83, lat: 20.30 },
  { id: "w2", name: "Sunita P.", trade: "House Cleaning", rating: 4.6, distanceKm: 2.1, lng: 85.81, lat: 20.29 },
  { id: "w3", name: "Manoj T.", trade: "Plumber", rating: 4.9, distanceKm: 0.8, lng: 85.825, lat: 20.298 },
];

export default function BookingFlowExample() {
  const [location, setLocation] = useState({ lng: 85.8245, lat: 20.2961, address: "" });
  const [selectedWorkerId, setSelectedWorkerId] = useState(MOCK_WORKERS[0].id);

  const selectedWorker = MOCK_WORKERS.find((w) => w.id === selectedWorkerId);

  // Live tracking stays off until the backend/worker app actually stream
  // real coordinates — flip `enabled` to true then and nothing else here
  // needs to change.
  const { location: liveLocation, isLive } = useWorkerTracking({
    workerId: selectedWorker?.id,
    initialLocation: selectedWorker,
    enabled: false,
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  });

  const trackedWorker = selectedWorker && { ...selectedWorker, ...(liveLocation ?? {}) };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-800">1. Set service location</h2>
        <LocationPicker mapboxToken={MAPBOX_TOKEN} initialLocation={location} onLocationChange={setLocation} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-800">2. Choose a worker</h2>
        <WorkerBookingMap
          mapboxToken={MAPBOX_TOKEN}
          center={location}
          workers={MOCK_WORKERS}
          selectedWorkerId={selectedWorkerId}
          onSelectWorker={setSelectedWorkerId}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium text-slate-800">
          3. Confirm {isLive && <span className="text-xs text-emerald-600">(live)</span>}
        </h2>
        <BookingMapPreview mapboxToken={MAPBOX_TOKEN} customerLocation={location} worker={trackedWorker} />
      </section>
    </div>
  );
}
