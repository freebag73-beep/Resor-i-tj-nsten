'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bluetooth, BluetoothOff, MapPin, Navigation, Square,
  CheckCircle, AlertCircle, Car, Clock, Gauge, Sparkles
} from 'lucide-react';
import { useBluetooth } from '@/lib/useBluetooth';
import { useTrip } from '@/lib/useTrip';

type Vehicle = { id: number; name: string; registration: string; bluetooth_name: string | null };

type Phase = 'setup' | 'tracking' | 'finish';

type Suggestion = {
  suggested: 'business' | 'private';
  confidence: number;
  source: 'history' | 'heuristic';
};

export default function NewTripPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('setup');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');
  const [purpose, setPurpose] = useState('');
  const [tripType, setTripType] = useState<'business' | 'private'>('business');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTs, setStartTs] = useState<number | null>(null);

  const bluetooth = useBluetooth(selectedVehicle?.bluetooth_name ?? settings.car_bluetooth_name ?? '');
  const trip = useTrip();

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d.settings ?? {});
      const vList: Vehicle[] = d.vehicles ?? [];
      setVehicles(vList);
      const defId = parseInt(d.settings?.default_vehicle_id ?? '0');
      const def = vList.find(v => v.id === defId) ?? vList[0] ?? null;
      setSelectedVehicle(def);
    });
  }, []);

  // Fetch suggestion when entering finish phase
  useEffect(() => {
    if (phase !== 'finish') return;
    const hour = new Date().getHours();
    fetch(`/api/trips/suggest-type?hour=${hour}`)
      .then(r => r.json())
      .then((s: Suggestion) => {
        setSuggestion(s);
        // Auto-apply the suggestion as the default
        setTripType(s.suggested);
      })
      .catch(() => {/* ignore */});
  }, [phase]);

  // Elapsed timer
  useEffect(() => {
    if (phase !== 'tracking') return;
    const id = setInterval(() => {
      setElapsed(startTs ? Math.floor((Date.now() - startTs) / 1000) : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [phase, startTs]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleConnectBluetooth = async () => {
    await bluetooth.connect();
  };

  const handleStartTrip = async () => {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('GPS stöds inte i denna webbläsare.');
      return;
    }
    try {
      await trip.startTrip({
        vehicleId: selectedVehicle?.id ?? null,
        driver: settings.driver_name ?? '',
        startOdometer: startOdometer ? parseFloat(startOdometer) : undefined,
      });
      setStartTs(Date.now());
      setPhase('tracking');
    } catch (e) {
      setError('Kunde inte hämta GPS-position. Kontrollera att platsbehörighet är aktiverad.');
      console.error(e);
    }
  };

  const handleStopTrip = async () => {
    setSaving(true);
    try {
      await trip.stopTrip({
        purpose,
        endOdometer: endOdometer ? parseFloat(endOdometer) : undefined,
        tripType,
      });
      router.push('/trips');
    } catch (e) {
      setError('Kunde inte spara resan.');
      console.error(e);
      setSaving(false);
    }
  };

  // ── SETUP PHASE ──────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <button onClick={() => router.back()} className="btn-ghost p-1">←</button>
          <h1 className="text-xl font-bold text-gray-900">Ny resa</h1>
        </div>

        {/* Bluetooth */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Bluetooth size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">Bilens Bluetooth</h2>
          </div>

          {bluetooth.status === 'unsupported' ? (
            <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 rounded-lg p-2">
              <AlertCircle size={16} />
              <span>Web Bluetooth stöds inte i denna webbläsare. Använd Chrome på Android eller desktop.</span>
            </div>
          ) : bluetooth.status === 'connected' ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
              <CheckCircle size={18} />
              <div>
                <p className="font-medium text-sm">Ansluten till {bluetooth.deviceName}</p>
                <p className="text-xs text-green-500">Resan kopplas till bilen</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                {settings.car_bluetooth_name
                  ? `Koppla till "${settings.car_bluetooth_name}" för automatisk igenkänning.`
                  : 'Koppla till bilens Bluetooth-system (radio/handsfree).'}
              </p>
              <button
                onClick={handleConnectBluetooth}
                disabled={bluetooth.status === 'scanning'}
                className="btn-outline w-full"
              >
                {bluetooth.status === 'scanning' ? (
                  <><span className="animate-spin">⟳</span> Söker...</>
                ) : (
                  <><Bluetooth size={16} /> Koppla till bil</>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-1 text-center">Valfritt – du kan starta resa utan Bluetooth</p>
            </div>
          )}
        </div>

        {/* Vehicle select */}
        {vehicles.length > 1 && (
          <div className="card space-y-2">
            <div className="flex items-center gap-2">
              <Car size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-800">Fordon</h2>
            </div>
            <select
              className="input"
              value={selectedVehicle?.id ?? ''}
              onChange={e => setSelectedVehicle(vehicles.find(v => v.id === parseInt(e.target.value)) ?? null)}
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.registration})</option>
              ))}
            </select>
          </div>
        )}

        {/* Odometer */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <Gauge size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Mätarställning vid start</h2>
          </div>
          <div className="relative">
            <input
              type="number"
              className="input pr-10"
              placeholder="t.ex. 45230"
              value={startOdometer}
              onChange={e => setStartOdometer(e.target.value)}
            />
            <span className="absolute right-3 top-2 text-sm text-gray-400">km</span>
          </div>
          <p className="text-xs text-gray-400">Valfritt – behövs för fullständig körjournal</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button onClick={handleStartTrip} className="btn-success w-full py-3 text-base">
          <Navigation size={20} />
          Starta resa med GPS-spårning
        </button>
      </div>
    );
  }

  // ── TRACKING PHASE ───────────────────────────────────────────
  if (phase === 'tracking') {
    const t = trip.activeTrip!;
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold text-gray-900">Pågående resa</h1>
          <div className="flex items-center gap-1 text-green-600 bg-green-50 rounded-full px-3 py-1 text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Spårar
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <Navigation size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-gray-900">{t.distanceKm.toFixed(1)}</p>
            <p className="text-xs text-gray-500">km</p>
          </div>
          <div className="card text-center">
            <Clock size={18} className="mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold text-gray-900">{formatElapsed(elapsed)}</p>
            <p className="text-xs text-gray-500">tid</p>
          </div>
          <div className="card text-center">
            <MapPin size={18} className="mx-auto text-red-500 mb-1" />
            <p className="text-lg font-bold text-gray-900">{t.routePoints.length}</p>
            <p className="text-xs text-gray-500">GPS-punkter</p>
          </div>
        </div>

        {/* Start info */}
        <div className="card">
          <div className="flex items-start gap-2">
            <div className="mt-1 w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Start {t.startTime}</p>
              <p className="text-sm font-medium text-gray-800">{t.startAddress || 'Hämtar adress…'}</p>
            </div>
          </div>
        </div>

        {bluetooth.status === 'connected' && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 rounded-lg p-2 text-sm">
            <Bluetooth size={14} />
            <span>Ansluten: {bluetooth.deviceName}</span>
          </div>
        )}
        {bluetooth.status === 'disconnected' && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-2 text-sm">
            <BluetoothOff size={14} />
            <span>Bluetooth frånkopplad – är du framme?</span>
          </div>
        )}

        <button
          onClick={() => setPhase('finish')}
          className="btn-danger w-full py-3 text-base"
        >
          <Square size={18} />
          Avsluta resa
        </button>
      </div>
    );
  }

  // ── FINISH PHASE ─────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 pt-2">
        <button onClick={() => setPhase('tracking')} className="btn-ghost p-1">←</button>
        <h1 className="text-xl font-bold text-gray-900">Avsluta resa</h1>
      </div>

      <div className="card bg-blue-50 border-blue-100">
        <p className="text-sm text-blue-800 font-medium">
          Körd sträcka: <span className="text-lg font-bold">{trip.activeTrip?.distanceKm.toFixed(1)} km</span>
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          Start: {trip.activeTrip?.startAddress}
        </p>
      </div>

      {/* Purpose */}
      <div className="card space-y-2">
        <label className="label">Ärende/Syfte *</label>
        <input
          type="text"
          className="input"
          placeholder="t.ex. Kundmöte, Konferens, Leverans…"
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-gray-400">Krävs av Skatteverket</p>
      </div>

      {/* Trip type with smart suggestion */}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <label className="label mb-0">Restyp</label>
          {suggestion && !suggestionDismissed && (
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5">
              <Sparkles size={11} />
              {suggestion.source === 'history'
                ? `Förslag baserat på historik (${suggestion.confidence}%)`
                : `Förslag baserat på tid på dygnet`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['business', 'private'] as const).map(t => {
            const isSuggested = suggestion?.suggested === t && !suggestionDismissed;
            return (
              <button
                key={t}
                onClick={() => {
                  setTripType(t);
                  setSuggestionDismissed(true);
                }}
                className={`rounded-lg border-2 py-2 text-sm font-medium transition-colors relative ${
                  tripType === t
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'business' ? 'Tjänsteresa' : 'Privat'}
                {isSuggested && tripType === t && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-purple-500 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>

        {suggestion && !suggestionDismissed && (
          <p className="text-xs text-gray-400">
            Appen föreslår <strong>{suggestion.suggested === 'business' ? 'Tjänsteresa' : 'Privat'}</strong>
            {suggestion.source === 'history'
              ? ' – baserat på dina tidigare resor vid denna tid.'
              : ' – baserat på att det är utanför arbetstid.'}
            {' '}Tryck för att välja ett annat alternativ.
          </p>
        )}
      </div>

      {/* End odometer */}
      <div className="card space-y-2">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-gray-500" />
          <label className="label mb-0">Mätarställning vid slut</label>
        </div>
        <div className="relative">
          <input
            type="number"
            className="input pr-10"
            placeholder="t.ex. 45278"
            value={endOdometer}
            onChange={e => setEndOdometer(e.target.value)}
          />
          <span className="absolute right-3 top-2 text-sm text-gray-400">km</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <button
        onClick={handleStopTrip}
        disabled={!purpose.trim() || saving}
        className="btn-primary w-full py-3 text-base"
      >
        <CheckCircle size={20} />
        {saving ? 'Sparar…' : 'Spara resa'}
      </button>
    </div>
  );
}
