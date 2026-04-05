import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const type = searchParams.get('type');

  let query = `
    SELECT t.*, v.name as vehicle_name, v.registration
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (year) {
    query += ` AND strftime('%Y', t.date) = ?`;
    params.push(year);
  }
  if (month) {
    query += ` AND strftime('%m', t.date) = ?`;
    params.push(month.padStart(2, '0'));
  }
  if (type) {
    query += ` AND t.trip_type = ?`;
    params.push(type);
  }

  query += ` ORDER BY t.date DESC, t.start_time DESC`;

  const trips = db.prepare(query).all(...params);
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const stmt = db.prepare(`
    INSERT INTO trips (
      vehicle_id, date, start_time, end_time,
      start_address, end_address, start_odometer, end_odometer,
      distance_km, purpose, driver, trip_type, route_points
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    body.vehicle_id ?? null,
    body.date,
    body.start_time,
    body.end_time ?? null,
    body.start_address ?? '',
    body.end_address ?? '',
    body.start_odometer ?? null,
    body.end_odometer ?? null,
    body.distance_km ?? null,
    body.purpose ?? '',
    body.driver ?? '',
    body.trip_type ?? 'business',
    body.route_points ? JSON.stringify(body.route_points) : null
  );

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(trip, { status: 201 });
}
