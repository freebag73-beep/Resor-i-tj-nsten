'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, MapPin, Clock, TrendingUp, Plus, Bluetooth } from 'lucide-react';

type Stats = {
  totalTrips: number;
  totalKm: number;
  monthTrips: number;
  monthKm: number;
};

type RecentTrip = {
  id: number;
  date: string;
  start_address: string;
  end_address: string;
  distance_km: number | null;
  purpose: string;
  trip_type: string;
};

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ totalTrips: 0, totalKm: 0, monthTrips: 0, monthKm: 0 });
  const [recent, setRecent] = useState<RecentTrip[]>([]);
  const [driverName, setDriverName] = useState('');
  const now = new Date();
  const yearStr = now.getFullYear().toString();
  const monthStr = String(now.getMonth() + 1);

  useEffect(() => {
    Promise.all([
      fetch(`/api/trips?year=${yearStr}&type=business`).then(r => r.json()),
      fetch(`/api/trips?year=${yearStr}&month=${monthStr}&type=business`).then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([allTrips, monthTrips, config]) => {
      setDriverName(config.settings?.driver_name ?? '');
      const sumKm = (arr: RecentTrip[]) =>
        arr.reduce((s: number, t) => s + (t.distance_km ?? 0), 0);
      setStats({
        totalTrips: allTrips.length,
        totalKm: sumKm(allTrips),
        monthTrips: monthTrips.length,
        monthKm: sumKm(monthTrips),
      });
      setRecent(allTrips.slice(0, 5));
    });
  }, [yearStr, monthStr]);

  const monthNames = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Körjournal</h1>
          {driverName && <p className="text-sm text-gray-500">{driverName}</p>}
        </div>
        <Link href="/trip/new" className="btn-primary">
          <Plus size={18} />
          Ny resa
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Denna månad</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.monthKm.toFixed(0)} <span className="text-base font-normal text-gray-500">km</span></p>
          <p className="text-sm text-gray-500">{stats.monthTrips} resa{stats.monthTrips !== 1 ? 'r' : ''}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Car size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">{yearStr} totalt</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalKm.toFixed(0)} <span className="text-base font-normal text-gray-500">km</span></p>
          <p className="text-sm text-gray-500">{stats.totalTrips} resa{stats.totalTrips !== 1 ? 'r' : ''}</p>
        </div>
      </div>

      {/* Quick start */}
      <div className="card bg-blue-50 border-blue-100">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Bluetooth size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-blue-900 text-sm">Starta resa med GPS-spårning</p>
            <p className="text-xs text-blue-700">Kopplar till bilens Bluetooth och spårar rutten automatiskt</p>
          </div>
        </div>
        <Link href="/trip/new" className="btn-primary w-full mt-3">
          <MapPin size={16} />
          Starta ny resa
        </Link>
      </div>

      {/* Recent trips */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">Senaste resor</h2>
            <Link href="/trips" className="text-sm text-blue-600 hover:underline">Visa alla</Link>
          </div>
          <div className="space-y-2">
            {recent.map(trip => (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="card flex items-start gap-3 hover:shadow-md transition-shadow block">
                <div className={`mt-1 rounded-full p-1.5 ${trip.trip_type === 'business' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Car size={14} className={trip.trip_type === 'business' ? 'text-blue-600' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{trip.purpose || 'Ej angett ärende'}</p>
                    <span className="text-xs text-gray-500 shrink-0">
                      {new Date(trip.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin size={11} />
                    <span className="truncate">{trip.start_address || '—'} → {trip.end_address || '—'}</span>
                  </div>
                  {trip.distance_km != null && (
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">{trip.distance_km.toFixed(1)} km</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div className="card text-center py-8">
          <Car size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Inga resor registrerade</p>
          <p className="text-sm text-gray-400 mt-1">Starta din första resa ovan</p>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        {monthNames[now.getMonth()]} {now.getFullYear()}
      </div>
    </div>
  );
}
