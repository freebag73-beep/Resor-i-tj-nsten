import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ?? new Date().getFullYear().toString();
  const month = searchParams.get('month');
  const type = searchParams.get('type') ?? 'business';
  const format = searchParams.get('format') ?? 'csv';

  let query = `
    SELECT t.*, v.name as vehicle_name, v.registration
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.trip_type = ? AND strftime('%Y', t.date) = ?
  `;
  const params: string[] = [type, year];

  if (month) {
    query += ` AND strftime('%m', t.date) = ?`;
    params.push(month.padStart(2, '0'));
  }

  query += ` ORDER BY t.date ASC, t.start_time ASC`;

  const trips = db.prepare(query).all(...params) as Record<string, unknown>[];

  if (format === 'csv') {
    const headers = [
      'Datum', 'Förare', 'Fordon', 'Reg.nr', 'Ärende/Syfte',
      'Startplats', 'Slutplats', 'Mätare start (km)', 'Mätare slut (km)',
      'Körd sträcka (km)', 'Starttid', 'Sluttid'
    ];

    const rows = trips.map(t => [
      t.date,
      t.driver,
      t.vehicle_name ?? '',
      t.registration ?? '',
      t.purpose,
      t.start_address,
      t.end_address,
      t.start_odometer ?? '',
      t.end_odometer ?? '',
      t.distance_km ?? '',
      t.start_time,
      t.end_time ?? ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));

    const csv = '\uFEFF' + [headers.map(h => `"${h}"`).join(';'), ...rows].join('\n');

    const filename = `korjournal_${year}${month ? '_' + month.padStart(2, '0') : ''}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // JSON format for client-side PDF generation
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of settingsRows) settings[row.key] = row.value;

  return NextResponse.json({ trips, settings, year, month });
}
