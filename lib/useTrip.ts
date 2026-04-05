'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

export type RoutePoint = { lat: number; lng: number; ts: number };

export type ActiveTrip = {
  id: number | null;
  startTime: string;
  startAddress: string;
  startOdometer: number | null;
  routePoints: RoutePoint[];
  distanceKm: number;
  vehicleId: number | null;
  driver: string;
};

function calcDistance(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const chord =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));
}

function reverseGeocode(lat: number, lng: number): Promise<string> {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=sv`
  )
    .then(r => r.json())
    .then(d => {
      const a = d.address ?? {};
      return [a.road, a.house_number, a.city || a.town || a.village || a.municipality]
        .filter(Boolean)
        .join(' ')
        || d.display_name?.split(',')[0]
        || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    })
    .catch(() => `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
}

export function useTrip() {
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [tracking, setTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<RoutePoint | null>(null);

  const startTrip = useCallback(async (opts: {
    vehicleId: number | null;
    driver: string;
    startOdometer?: number;
  }) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const startTime = now.toTimeString().slice(0, 5);

    // Get current position
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true, timeout: 10000
      })
    );
    const startPt: RoutePoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      ts: pos.timestamp,
    };
    const startAddress = await reverseGeocode(startPt.lat, startPt.lng);

    // Create trip in DB
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: opts.vehicleId,
        date,
        start_time: startTime,
        start_address: startAddress,
        start_odometer: opts.startOdometer ?? null,
        driver: opts.driver,
        trip_type: 'business',
        route_points: [startPt],
      }),
    });
    const trip = await res.json();

    lastPointRef.current = startPt;
    setActiveTrip({
      id: trip.id,
      startTime,
      startAddress,
      startOdometer: opts.startOdometer ?? null,
      routePoints: [startPt],
      distanceKm: 0,
      vehicleId: opts.vehicleId,
      driver: opts.driver,
    });
    setTracking(true);
  }, []);

  // Watch position while tracking
  useEffect(() => {
    if (!tracking) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const pt: RoutePoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: pos.timestamp,
        };

        setActiveTrip(prev => {
          if (!prev) return prev;
          const last = lastPointRef.current;
          const added = last ? calcDistance(last, pt) : 0;
          if (added > 0.01) lastPointRef.current = pt; // Only add if > 10m
          if (added <= 0.01) return prev;

          const newPoints = [...prev.routePoints, pt];
          const newDist = prev.distanceKm + added;

          // Patch trip in DB (debounced via 5 point batches)
          if (newPoints.length % 5 === 0 && prev.id) {
            fetch(`/api/trips/${prev.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                route_points: newPoints,
                distance_km: parseFloat(newDist.toFixed(3)),
              }),
            });
          }

          return { ...prev, routePoints: newPoints, distanceKm: newDist };
        });
      },
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, distanceFilter: 10 } as PositionOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tracking]);

  const stopTrip = useCallback(async (opts: {
    purpose: string;
    endOdometer?: number;
    tripType?: 'business' | 'private';
  }) => {
    if (!activeTrip || !activeTrip.id) return null;

    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5);

    const last = activeTrip.routePoints[activeTrip.routePoints.length - 1];
    const endAddress = last ? await reverseGeocode(last.lat, last.lng) : '';

    const res = await fetch(`/api/trips/${activeTrip.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        end_time: endTime,
        end_address: endAddress,
        end_odometer: opts.endOdometer ?? null,
        distance_km: parseFloat(activeTrip.distanceKm.toFixed(3)),
        purpose: opts.purpose,
        trip_type: opts.tripType ?? 'business',
        route_points: activeTrip.routePoints,
      }),
    });

    setTracking(false);
    setActiveTrip(null);
    return res.json();
  }, [activeTrip]);

  return { activeTrip, tracking, startTrip, stopTrip };
}
