import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, upsertVehicle } from '@/lib/db';

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.settings) {
    saveSettings(body.settings);
  }

  if (body.vehicle) {
    upsertVehicle(body.vehicle);
  }

  return NextResponse.json({ ok: true });
}
