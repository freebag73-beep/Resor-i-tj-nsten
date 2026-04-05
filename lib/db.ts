import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'trips.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      registration TEXT NOT NULL,
      bluetooth_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER REFERENCES vehicles(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      start_address TEXT NOT NULL DEFAULT '',
      end_address TEXT NOT NULL DEFAULT '',
      start_odometer REAL,
      end_odometer REAL,
      distance_km REAL,
      purpose TEXT NOT NULL DEFAULT '',
      driver TEXT NOT NULL DEFAULT '',
      trip_type TEXT NOT NULL DEFAULT 'business',
      route_points TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('driver_name', ''),
      ('default_vehicle_id', ''),
      ('car_bluetooth_name', '');
  `);
}

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

export type Settings = Record<string, string>;
