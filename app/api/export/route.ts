import { NextRequest, NextResponse } from 'next/server';
import { getTrips, getSettings } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') ?? new Date().getFullYear().toString();
  const month = searchParams.get('month') ?? undefined;
  const type = searchParams.get('type') ?? 'business';
  const format = searchParams.get('format') ?? 'csv';

  const trips = getTrips({ year, month, type }).reverse(); // ascending for export

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

  // JSON for client-side PDF generation
  const { settings } = getSettings();
  return NextResponse.json({ trips, settings, year, month: month ?? null });
}
