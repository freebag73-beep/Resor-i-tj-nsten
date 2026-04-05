import { NextRequest, NextResponse } from 'next/server';
import { getTrips, createTrip } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trips = getTrips({
    year: searchParams.get('year') ?? undefined,
    month: searchParams.get('month') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  });
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const trip = createTrip({
    vehicle_id: body.vehicle_id ?? null,
    date: body.date,
    start_time: body.start_time,
    end_time: body.end_time ?? null,
    start_address: body.start_address ?? '',
    end_address: body.end_address ?? '',
    start_odometer: body.start_odometer ?? null,
    end_odometer: body.end_odometer ?? null,
    distance_km: body.distance_km ?? null,
    purpose: body.purpose ?? '',
    driver: body.driver ?? '',
    trip_type: body.trip_type ?? 'business',
    route_points: body.route_points ? JSON.stringify(body.route_points) : null,
  });
  return NextResponse.json(trip, { status: 201 });
}
