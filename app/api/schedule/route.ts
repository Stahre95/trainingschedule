import { promises as fs } from 'fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { defaultSchedule, type ScheduleData } from '../../lib/schedule';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'schedule.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(fileContents) as ScheduleData;

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(defaultSchedule);
  }
}
