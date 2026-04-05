import { NextRequest, NextResponse } from 'next/server';
import { getTrips } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hour = parseInt(searchParams.get('hour') ?? '8');

  const allTrips = await getTrips();
  let business = 0;
  let private_ = 0;
  for (const t of allTrips) {
    const h = parseInt(t.start_time?.split(':')[0] ?? '-1');
    if (Math.abs(h - hour) <= 1) {
      if (t.trip_type === 'business') business++;
      else private_++;
    }
  }

  const total = business + private_;
  if (total >= 3) {
    const suggested: 'business' | 'private' = business >= private_ ? 'business' : 'private';
    const confidence = Math.round((Math.max(business, private_) / total) * 100);
    return NextResponse.json({ suggested, confidence, source: 'history', business, private: private_ });
  }

  const isWorkingHour = hour >= 7 && hour <= 18;
  return NextResponse.json({ suggested: isWorkingHour ? 'business' : 'private', confidence: 60, source: 'heuristic', business, private: private_ });
}
