import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export type Trip = {
  id: number;
  vehicle_id: number | null;
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
  trip_type: 'business' | 'private';
  route_points: string | null;
  created_at: string;
};

export type Vehicle = {
  id: number;
  name: string;
  registration: string;
  bluetooth_name: string | null;
  created_at: string;
};

type Db = {
  trips: Trip[];
  vehicles: Vehicle[];
  settings: Record<string, string>;
  nextTripId: number;
  nextVehicleId: number;
};

function load(): Db {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial: Db = {
      trips: [],
      vehicles: [],
      settings: { driver_name: '', default_vehicle_id: '', car_bluetooth_name: '' },
      nextTripId: 1,
      nextVehicleId: 1,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as Db;
}

function save(db: Db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ── Trips ────────────────────────────────────────────────────

export function getTrips(filters: { year?: string; month?: string; type?: string } = {}): (Trip & { vehicle_name: string | null; registration: string | null })[] {
  const db = load();
  let trips = db.trips.filter(t => {
    if (filters.year && !t.date.startsWith(filters.year)) return false;
    if (filters.month && t.date.slice(5, 7) !== filters.month.padStart(2, '0')) return false;
    if (filters.type && t.trip_type !== filters.type) return false;
    return true;
  });
  trips = trips.sort((a, b) => (a.date + a.start_time) < (b.date + b.start_time) ? 1 : -1);
  return trips.map(t => {
    const v = db.vehicles.find(v => v.id === t.vehicle_id) ?? null;
    return { ...t, vehicle_name: v?.name ?? null, registration: v?.registration ?? null };
  });
}

export function createTrip(data: Omit<Trip, 'id' | 'created_at'>): Trip {
  const db = load();
  const trip: Trip = {
    ...data,
    id: db.nextTripId++,
    created_at: new Date().toISOString(),
  };
  db.trips.push(trip);
  save(db);
  return trip;
}

export function getTrip(id: number): (Trip & { vehicle_name: string | null; registration: string | null }) | null {
  const db = load();
  const trip = db.trips.find(t => t.id === id) ?? null;
  if (!trip) return null;
  const v = db.vehicles.find(v => v.id === trip.vehicle_id) ?? null;
  return { ...trip, vehicle_name: v?.name ?? null, registration: v?.registration ?? null };
}

export function updateTrip(id: number, data: Partial<Trip>): Trip & { vehicle_name: string | null; registration: string | null } | null {
  const db = load();
  const idx = db.trips.findIndex(t => t.id === id);
  if (idx === -1) return null;
  db.trips[idx] = { ...db.trips[idx], ...data };
  save(db);
  const v = db.vehicles.find(v => v.id === db.trips[idx].vehicle_id) ?? null;
  return { ...db.trips[idx], vehicle_name: v?.name ?? null, registration: v?.registration ?? null };
}

export function deleteTrip(id: number) {
  const db = load();
  db.trips = db.trips.filter(t => t.id !== id);
  save(db);
}

// ── Settings & Vehicles ──────────────────────────────────────

export function getSettings(): { settings: Record<string, string>; vehicles: Vehicle[] } {
  const db = load();
  return { settings: db.settings, vehicles: db.vehicles };
}

export function saveSettings(settings: Record<string, string>) {
  const db = load();
  db.settings = { ...db.settings, ...settings };
  save(db);
}

export function upsertVehicle(v: { id?: number; name: string; registration: string; bluetooth_name?: string }): Vehicle {
  const db = load();
  if (v.id) {
    const idx = db.vehicles.findIndex(x => x.id === v.id);
    if (idx !== -1) {
      db.vehicles[idx] = { ...db.vehicles[idx], name: v.name, registration: v.registration, bluetooth_name: v.bluetooth_name ?? null };
      save(db);
      return db.vehicles[idx];
    }
  }
  const vehicle: Vehicle = {
    id: db.nextVehicleId++,
    name: v.name,
    registration: v.registration,
    bluetooth_name: v.bluetooth_name ?? null,
    created_at: new Date().toISOString(),
  };
  db.vehicles.push(vehicle);
  db.settings.default_vehicle_id = String(vehicle.id);
  save(db);
  return vehicle;
}
