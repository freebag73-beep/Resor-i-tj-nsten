'use client';
import { useEffect, useState } from 'react';
import { User, Car, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';

type Vehicle = { id?: number; name: string; registration: string; bluetooth_name: string };

export default function SettingsPage() {
  const [driverName, setDriverName] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setDriverName(d.settings?.driver_name ?? '');
        setVehicles(
          (d.vehicles ?? []).map((v: Vehicle) => ({
            id: v.id,
            name: v.name,
            registration: v.registration,
            bluetooth_name: v.bluetooth_name ?? '',
          }))
        );
        setLoading(false);
      })
      .catch(err => {
        console.error('Settings load error:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    // Save settings
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: {
          driver_name: driverName,
        },
      }),
    });

    // Save/update vehicles
    for (const v of vehicles) {
      if (!v.name || !v.registration) continue;
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: v }),
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addVehicle = () => {
    setVehicles(prev => [...prev, { name: '', registration: '', bluetooth_name: '' }]);
  };

  const updateVehicle = (i: number, field: keyof Vehicle, value: string) => {
    setVehicles(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v));
  };

  const removeVehicle = (i: number) => {
    setVehicles(prev => prev.filter((_, idx) => idx !== i));
  };

  if (loading) {
    return <div className="p-4 space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="card h-24 bg-gray-50" />)}</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Inställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Konfigurera körjournal och fordon</p>
      </div>

      {/* Driver */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <User size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-800">Förare</h2>
        </div>
        <div>
          <label className="label">Ditt namn</label>
          <input
            type="text"
            className="input"
            placeholder="Anna Svensson"
            value={driverName}
            onChange={e => setDriverName(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Anges på alla resor och i körjournalen</p>
        </div>
      </div>

      {/* Vehicles */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">Fordon</h2>
          </div>
          <button onClick={addVehicle} className="btn-ghost text-blue-600 text-sm gap-1">
            <Plus size={15} /> Lägg till
          </button>
        </div>

        {vehicles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Inga fordon tillagda</p>
        )}

        {vehicles.map((v, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Fordon {i + 1}</span>
              <button onClick={() => removeVehicle(i)} className="text-red-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
            <div>
              <label className="label">Namn/modell</label>
              <input className="input" placeholder="Volvo V70" value={v.name} onChange={e => updateVehicle(i, 'name', e.target.value)} />
            </div>
            <div>
              <label className="label">Registreringsnummer</label>
              <input className="input" placeholder="ABC 123" value={v.registration} onChange={e => updateVehicle(i, 'registration', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Bluetooth-namn (valfritt)</label>
              <input className="input" placeholder="Fordonets specifika BT-namn" value={v.bluetooth_name} onChange={e => updateVehicle(i, 'bluetooth_name', e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} className="btn-primary w-full py-3 text-base">
        <Save size={20} />
        Spara inställningar
      </button>

      {saved && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3 text-sm">
          <CheckCircle size={18} />
          Inställningarna har sparats!
        </div>
      )}

      {/* About */}
      <div className="card bg-gray-50 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-500">Om appen</p>
        <p>Körjournal för tjänsteresor enligt Skatteverkets krav.</p>
        <p>Data lagras lokalt på servern. Exportera CSV eller PDF för att skicka till Skatteverket.</p>
      </div>
    </div>
  );
}
