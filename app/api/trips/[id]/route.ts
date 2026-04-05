import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const trip = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.registration
    FROM trips t LEFT JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.id = ?
  `).get(id);
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    'end_time', 'end_address', 'end_odometer', 'distance_km',
    'purpose', 'driver', 'trip_type', 'start_address', 'start_odometer',
    'route_points', 'vehicle_id', 'date', 'start_time'
  ];

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      updates.push(`${field} = ?`);
      values.push(
        field === 'route_points' && Array.isArray(body[field])
          ? JSON.stringify(body[field])
          : body[field]
      );
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(id);
  db.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const trip = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.registration
    FROM trips t LEFT JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.id = ?
  `).get(id);
  return NextResponse.json(trip);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  db.prepare('DELETE FROM trips WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
