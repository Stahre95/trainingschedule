import { NextResponse } from 'next/server';
import { readScheduleData } from '../../lib/schedule-storage';

export async function GET() {
  const schedule = await readScheduleData();

  if (!schedule) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Schemat gick inte att ladda.',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    );
  }

  return NextResponse.json(schedule, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
