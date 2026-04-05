import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;

  const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id').all();
  return NextResponse.json({ settings, vehicles });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  // Upsert settings
  if (body.settings) {
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(body.settings)) {
      upsert.run(key, String(value));
    }
  }

  // Handle vehicle upsert
  if (body.vehicle) {
    const v = body.vehicle;
    if (v.id) {
      db.prepare('UPDATE vehicles SET name=?, registration=?, bluetooth_name=? WHERE id=?')
        .run(v.name, v.registration, v.bluetooth_name ?? null, v.id);
    } else {
      const result = db.prepare('INSERT INTO vehicles (name, registration, bluetooth_name) VALUES (?, ?, ?)')
        .run(v.name, v.registration, v.bluetooth_name ?? null);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('default_vehicle_id', ?)")
        .run(String(result.lastInsertRowid));
    }
  }

  return NextResponse.json({ ok: true });
}
