'use client';
import { useEffect, useRef } from 'react';

type LatLng = { lat: number; lng: number };

type Props = {
  routePoints: LatLng[] | null;
  startAddress: string;
  endAddress: string;
};

async function geocode(address: string): Promise<LatLng | null> {
  if (!address) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'sv' } }
    );
    const data = await res.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function TripMap({ routePoints, startAddress, endAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (destroyed || !containerRef.current) return;
      if (mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      const greenDot = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconAnchor: [7, 7],
      });
      const redDot = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconAnchor: [7, 7],
      });

      if (routePoints && routePoints.length >= 2) {
        // Draw GPS route
        const latlngs = routePoints.map(p => [p.lat, p.lng] as [number, number]);
        const poly = L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.85 });
        poly.addTo(map);
        L.marker(latlngs[0], { icon: greenDot }).addTo(map);
        L.marker(latlngs[latlngs.length - 1], { icon: redDot }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [24, 24] });
      } else {
        // Geocode start and end addresses
        const [start, end] = await Promise.all([
          geocode(startAddress),
          geocode(endAddress),
        ]);
        if (destroyed) return;

        const points: [number, number][] = [];
        if (start) {
          L.marker([start.lat, start.lng], { icon: greenDot }).addTo(map);
          points.push([start.lat, start.lng]);
        }
        if (end) {
          L.marker([end.lat, end.lng], { icon: redDot }).addTo(map);
          points.push([end.lat, end.lng]);
        }
        if (start && end) {
          L.polyline(points, { color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '8 6' }).addTo(map);
          map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
        } else if (points.length === 1) {
          map.setView(points[0], 13);
        } else {
          map.setView([59.33, 18.07], 10); // Stockholm fallback
        }
      }
    })();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [routePoints, startAddress, endAddress]);

  return (
    <div
      ref={containerRef}
      style={{ height: 260, borderRadius: 12, overflow: 'hidden', background: '#e5e7eb' }}
    />
  );
}
