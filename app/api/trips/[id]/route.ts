import { NextRequest, NextResponse } from 'next/server';
import { getTrip, updateTrip, deleteTrip } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = getTrip(parseInt(id));
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if ('route_points' in body && Array.isArray(body.route_points)) {
    body.route_points = JSON.stringify(body.route_points);
  }

  const trip = updateTrip(parseInt(id), body);
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(trip);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteTrip(parseInt(id));
  return NextResponse.json({ ok: true });
}
