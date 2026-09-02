# Mapbox Booking Map — Components

Three components + two hooks for the booking flow: address search with a
draggable pin, a worker map synced to a card list, and a compact map preview
for the confirmation screen. Real-time worker tracking is wired but **off by
default** until your backend/worker app actually stream live coordinates.

## 1. Install dependencies

```bash
npm install mapbox-gl
```

Tailwind CSS is assumed to already be set up in your project (all components
use Tailwind utility classes). If it isn't:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 2. Environment variables

Add to your `.env` (Vite convention — adjust prefix if using CRA/Next):

```
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token
VITE_API_BASE_URL=https://your-backend.example.com/api
```

Get a public token from https://account.mapbox.com/access-tokens/.

## 3. File layout

Drop these into your project as-is:

```
src/
  lib/
    mapboxClient.js         # forward/reverse geocoding helpers
  hooks/
    useDebouncedValue.js    # debounce for the address search input
    useWorkerTracking.js    # real-time tracking hook, disabled by default
  components/
    LocationPicker.jsx      # address autocomplete + draggable pin
    WorkerBookingMap.jsx    # worker markers synced with worker cards
    BookingMapPreview.jsx   # compact map for the confirmation screen
  BookingFlowExample.jsx    # reference wiring — not required at runtime
```

## 4. Usage

```jsx
import LocationPicker from "./components/LocationPicker";

<LocationPicker
  mapboxToken={import.meta.env.VITE_MAPBOX_TOKEN}
  initialLocation={{ lng: 85.8245, lat: 20.2961 }}
  onLocationChange={({ lng, lat, address }) => {
    // save to booking form state
  }}
/>
```

```jsx
import WorkerBookingMap from "./components/WorkerBookingMap";

<WorkerBookingMap
  mapboxToken={import.meta.env.VITE_MAPBOX_TOKEN}
  center={location}
  workers={nearbyWorkers}          // from your backend's nearby-workers endpoint
  selectedWorkerId={selectedWorkerId}
  onSelectWorker={setSelectedWorkerId}
/>
```

```jsx
import BookingMapPreview from "./components/BookingMapPreview";

<BookingMapPreview
  mapboxToken={import.meta.env.VITE_MAPBOX_TOKEN}
  customerLocation={location}
  worker={selectedWorker}          // { lng, lat, name }
/>
```

See `BookingFlowExample.jsx` for all three wired together in one flow.

## 5. Turning on real-time tracking (later)

`useWorkerTracking` already exists and is imported in the example, but does
nothing extra until you flip it on — it just passes through the static
worker location you gave it, with `isLive: false`.

Once the backend or worker app expose live coordinates:

1. Decide on a transport: a polling REST endpoint (`GET /workers/:id/location`)
   or a WebSocket stream — the hook supports either.
2. Pass `enabled: true` and the relevant URL(s):

```jsx
const { location, isLive } = useWorkerTracking({
  workerId: selectedWorker.id,
  initialLocation: selectedWorker,
  enabled: true,
  transport: "polling",            // or "websocket"
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  pollIntervalMs: 5000,
});
```

3. Nothing else changes — `WorkerBookingMap` and `BookingMapPreview` already
   accept updated `lng`/`lat` and move the marker smoothly.

## Notes

- Colors used: `#1f6f5c` (cooperative green — customer/booking pin) and
  `#f59e0b` (amber — worker markers), matching the trust/cooperative palette
  from the landing page. Adjust to your actual design tokens if they differ.
- All maps use the `streets-v12` Mapbox style; swap for a custom style URL
  if you have one.
- Geocoding is scoped to India (`country: "in"`) by default — change in
  `mapboxClient.js` if you need other regions.
