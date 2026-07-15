import { NextResponse } from 'next/server';
import { readScheduleData } from '../../lib/schedule-storage';

export async function GET() {
  const schedule = await readScheduleData();
  return NextResponse.json(schedule);
}
