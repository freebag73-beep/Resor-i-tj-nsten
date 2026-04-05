'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Car, MapPin, Filter, ChevronRight, Plus } from 'lucide-react';

type Trip = {
  id: number;
  date: string;
  start_time: string;
  end_time: string | null;
  start_address: string;
  end_address: string;
  distance_km: number | null;
  purpose: string;
  trip_type: string;
  vehicle_name: string | null;
  registration: string | null;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (month) params.set('month', month);
    if (typeFilter) params.set('type', typeFilter);
    fetch(`/api/trips?${params}`).then(r => r.json()).then(data => {
      setTrips(data);
      setLoading(false);
    });
  }, [year, month, typeFilter]);

  const totalKm = trips.reduce((s, t) => s + (t.distance_km ?? 0), 0);
  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  const monthNames = ['Alla månader','Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Resor</h1>
        <Link href="/trip/new" className="btn-primary">
          <Plus size={16} /> Ny
        </Link>
      </div>

      {/* Filters */}
      <div className="card space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select className="input text-sm" value={year} onChange={e => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input text-sm" value={month} onChange={e => setMonth(e.target.value)}>
            {monthNames.map((m, i) => <option key={i} value={i === 0 ? '' : String(i)}>{m}</option>)}
          </select>
          <select className="input text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Alla typer</option>
            <option value="business">Tjänst</option>
            <option value="private">Privat</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {trips.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 px-1">
          <span>{trips.length} resa{trips.length !== 1 ? 'r' : ''}</span>
          <span className="font-semibold text-blue-700">{totalKm.toFixed(1)} km totalt</span>
        </div>
      )}

      {/* Trip list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="card h-20 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="card text-center py-10">
          <Car size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Inga resor hittades</p>
          <Link href="/trip/new" className="btn-primary mt-4 inline-flex">
            <Plus size={16} /> Starta en resa
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {trips.map(trip => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="card flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className={`rounded-full p-2 shrink-0 ${
                trip.trip_type === 'business' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Car size={16} className={trip.trip_type === 'business' ? 'text-blue-600' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">{trip.purpose || '(inget ärende)'}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(trip.date + 'T12:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
                  <MapPin size={10} />
                  <span className="truncate">{trip.start_address || '—'} → {trip.end_address || '—'}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {trip.distance_km != null && (
                    <span className="text-xs font-medium text-blue-600">{trip.distance_km.toFixed(1)} km</span>
                  )}
                  {trip.vehicle_name && (
                    <span className="text-xs text-gray-400">{trip.registration}</span>
                  )}
                  <span className={`text-xs rounded-full px-2 py-0.5 ${
                    trip.trip_type === 'business'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {trip.trip_type === 'business' ? 'Tjänst' : 'Privat'}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
