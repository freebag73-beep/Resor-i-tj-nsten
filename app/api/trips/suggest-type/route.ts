import { NextRequest, NextResponse } from 'next/server';
import { getTrips } from '@/lib/db';

/**
 * GET /api/trips/suggest-type?hour=8
 *
 * Returns a suggested trip_type ('business' | 'private') based on the
 * distribution of past trips started at the same hour of the day.
 * Falls back to time-of-day heuristics when there is not enough history.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hour = parseInt(searchParams.get('hour') ?? '8');

  // Look at all recorded trips
  const allTrips = getTrips();

  // Count trips at the same hour ± 1 h
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
    // Enough history — use the majority type for this hour window
    const suggested: 'business' | 'private' = business >= private_ ? 'business' : 'private';
    const confidence = Math.round((Math.max(business, private_) / total) * 100);
    return NextResponse.json({ suggested, confidence, source: 'history', business, private: private_ });
  }

  // Fallback: simple heuristic (working hours → business, evenings/weekends → private)
  const isWorkingHour = hour >= 7 && hour <= 18;
  const suggested: 'business' | 'private' = isWorkingHour ? 'business' : 'private';
  return NextResponse.json({ suggested, confidence: 60, source: 'heuristic', business, private: private_ });
}
