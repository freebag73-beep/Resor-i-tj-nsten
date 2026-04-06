'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  MapPin, Car, Clock, Gauge, FileText, Trash2, Edit2, CheckCircle, ArrowLeft, Briefcase, Home
} from 'lucide-react';
import dynamic from 'next/dynamic';

const TripMap = dynamic(() => import('@/components/TripMap'), { ssr: false, loading: () => (
  <div style={{ height: 260, borderRadius: 12, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span className="text-sm text-gray-400">Laddar karta…</span>
  </div>
) });

type Trip = {
  id: number;
  date: string;
  start_time: string;
  end_time: string | null;
  start_address: string;
  end_address: string;
  start_odometer: number | null;
  end_odometer: number | null;
  distance_km: number | null;
  purpose: string;
  driver: string;
  trip_type: string;
  vehicle_name: string | null;
  registration: string | null;
  route_points: string | null;
};

export default function TripDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Trip>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`).then(r => r.json()).then(data => {
      setTrip(data);
      setForm(data);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/trips/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setTrip(updated);
    setForm(updated);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Ta bort denna resa?')) return;
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    router.push('/trips');
  };

  const handleToggleType = async () => {
    if (!trip) return;
    const newType = trip.trip_type === 'business' ? 'private' : 'business';
    const res = await fetch(`/api/trips/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip_type: newType }),
    });
    const updated = await res.json();
    setTrip(updated);
    setForm(updated);
  };

  if (!trip) {
    return <div className="p-4 space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="card h-16 bg-gray-50" />)}</div>;
  }

  const dateFormatted = new Date(trip.date + 'T12:00').toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => router.back()} className="btn-ghost gap-1">
          <ArrowLeft size={18} /> Tillbaka
        </button>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-outline gap-1">
              <Edit2 size={15} /> Redigera
            </button>
          )}
          <button onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50 gap-1">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${trip.trip_type === 'business' ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Car size={20} className={trip.trip_type === 'business' ? 'text-blue-600' : 'text-gray-500'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg">{trip.purpose || '(inget ärende)'}</p>
            <p className="text-sm text-gray-500 capitalize">{dateFormatted}</p>
          </div>
        </div>
      </div>

      {/* Trip type toggle – quick switch without entering edit mode */}
      {!editing && (
        <div className="card">
          <p className="text-xs text-gray-500 mb-2 font-medium">RESTYP</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => trip.trip_type !== 'business' && handleToggleType()}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                trip.trip_type === 'business'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <Briefcase size={18} />
              Tjänsteresa
            </button>
            <button
              onClick={() => trip.trip_type !== 'private' && handleToggleType()}
              className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                trip.trip_type === 'private'
                  ? 'border-gray-500 bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              <Home size={18} />
              Privat
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Tryck för att byta – sparas direkt</p>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="card space-y-3">
            <div>
              <label className="label">Ärende</label>
              <input className="input" value={form.purpose ?? ''} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
            </div>
            <div>
              <label className="label">Datum</label>
              <input type="date" className="input" value={form.date ?? ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Starttid</label>
                <input type="time" className="input" value={form.start_time ?? ''} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Sluttid</label>
                <input type="time" className="input" value={form.end_time ?? ''} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Startplats</label>
              <input className="input" value={form.start_address ?? ''} onChange={e => setForm(p => ({ ...p, start_address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Slutplats</label>
              <input className="input" value={form.end_address ?? ''} onChange={e => setForm(p => ({ ...p, end_address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Mätare start (km)</label>
                <input type="number" className="input" value={form.start_odometer ?? ''} onChange={e => setForm(p => ({ ...p, start_odometer: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
              <div>
                <label className="label">Mätare slut (km)</label>
                <input type="number" className="input" value={form.end_odometer ?? ''} onChange={e => setForm(p => ({ ...p, end_odometer: e.target.value ? parseFloat(e.target.value) : null }))} />
              </div>
            </div>
            <div>
              <label className="label">Körd sträcka (km)</label>
              <input type="number" step="0.1" className="input" value={form.distance_km ?? ''} onChange={e => setForm(p => ({ ...p, distance_km: e.target.value ? parseFloat(e.target.value) : null }))} />
            </div>
            <div>
              <label className="label">Restyp</label>
              <select className="input" value={form.trip_type ?? 'business'} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))}>
                <option value="business">Tjänsteresa</option>
                <option value="private">Privat</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              <CheckCircle size={16} /> {saving ? 'Sparar…' : 'Spara ändringar'}
            </button>
            <button onClick={() => { setEditing(false); setForm(trip); }} className="btn-outline">
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Route */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> Rutt
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="w-0.5 h-8 bg-gray-200 my-1" />
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs text-gray-400">Start · {trip.start_time}</p>
                  <p className="text-sm font-medium text-gray-800">{trip.start_address || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Mål · {trip.end_time ?? '—'}</p>
                  <p className="text-sm font-medium text-gray-800">{trip.end_address || '—'}</p>
                </div>
              </div>
            </div>
            {/* Map */}
            <TripMap
              routePoints={trip.route_points ? JSON.parse(trip.route_points) : null}
              startAddress={trip.start_address}
              endAddress={trip.end_address}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {trip.distance_km != null && (
              <div className="card text-center">
                <MapPin size={18} className="mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold text-gray-900">{trip.distance_km.toFixed(1)}</p>
                <p className="text-xs text-gray-500">km körd sträcka</p>
              </div>
            )}
            {trip.start_time && trip.end_time && (
              <div className="card text-center">
                <Clock size={18} className="mx-auto text-purple-500 mb-1" />
                <p className="text-xl font-bold text-gray-900">
                  {(() => {
                    const [sh, sm] = trip.start_time.split(':').map(Number);
                    const [eh, em] = (trip.end_time!).split(':').map(Number);
                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                    return mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins}m`;
                  })()}
                </p>
                <p className="text-xs text-gray-500">restid</p>
              </div>
            )}
          </div>

          {/* Odometer */}
          {(trip.start_odometer != null || trip.end_odometer != null) && (
            <div className="card space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Gauge size={16} className="text-gray-500" /> Mätarställning
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Vid start</p>
                  <p className="font-semibold">{trip.start_odometer?.toLocaleString('sv-SE') ?? '—'} km</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Vid slut</p>
                  <p className="font-semibold">{trip.end_odometer?.toLocaleString('sv-SE') ?? '—'} km</p>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="card space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={16} className="text-gray-500" /> Detaljer
            </h3>
            <div className="space-y-1.5 text-sm">
              {trip.driver && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Förare</span>
                  <span className="font-medium">{trip.driver}</span>
                </div>
              )}
              {trip.vehicle_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Fordon</span>
                  <span className="font-medium">{trip.vehicle_name} ({trip.registration})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
