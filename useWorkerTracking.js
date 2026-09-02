import { useEffect, useRef, useState } from "react";

/**
 * Real-time worker location tracking — INACTIVE BY DEFAULT.
 *
 * The backend/worker app do not yet stream live coordinates. Until that
 * exists, this hook simply returns the worker's last-known static location
 * (whatever was passed in) with `isLive: false`, so every component that
 * consumes it (WorkerBookingMap, BookingMapPreview) keeps working exactly
 * as-is with no behavior change.
 *
 * WHEN THE BACKEND ADDS LIVE COORDINATES:
 * Turn this on by passing `enabled: true` and wiring one of the two
 * transports stubbed below (pick whichever the backend actually
 * implements — don't build both). Nothing else in the UI layer needs to
 * change; components already consume { lng, lat, isLive } from this hook.
 */
export function useWorkerTracking({
  workerId,
  initialLocation,
  enabled = false,
  transport = "polling", // "polling" | "websocket"
  pollIntervalMs = 5000,
  apiBaseUrl,
  websocketUrl,
}) {
  const [location, setLocation] = useState(initialLocation ?? null);
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef(null);

  // Reset to the static fallback whenever the tracked worker changes.
  useEffect(() => {
    setLocation(initialLocation ?? null);
    setIsLive(false);
  }, [workerId, initialLocation]);

  useEffect(() => {
    if (!enabled || !workerId) return;

    let cancelled = false;

    if (transport === "polling") {
      // --- STUB: point this at the real endpoint once it exists, e.g.
      // GET `${apiBaseUrl}/workers/${workerId}/location`
      // Expected response shape: { lng, lat, updatedAt }
      const poll = async () => {
        try {
          const res = await fetch(`${apiBaseUrl}/workers/${workerId}/location`);
          if (!res.ok) throw new Error(`Tracking request failed: ${res.status}`);
          const data = await res.json();
          if (!cancelled) {
            setLocation({ lng: data.lng, lat: data.lat });
            setIsLive(true);
          }
        } catch {
          if (!cancelled) setIsLive(false);
        }
      };
      poll();
      const interval = setInterval(poll, pollIntervalMs);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    if (transport === "websocket") {
      // --- STUB: point this at the real socket contract once it exists.
      // Expected inbound message shape: { workerId, lng, lat }
      const socket = new WebSocket(websocketUrl);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.workerId === workerId) {
            setLocation({ lng: data.lng, lat: data.lat });
            setIsLive(true);
          }
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => setIsLive(false);
      socket.onerror = () => setIsLive(false);

      return () => socket.close();
    }
  }, [enabled, workerId, transport, apiBaseUrl, websocketUrl, pollIntervalMs]);

  return { location, isLive };
}
