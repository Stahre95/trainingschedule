import { ScheduleView } from './components/schedule-view';
import { readScheduleData } from './lib/schedule-storage';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const schedule = await readScheduleData();
  const initialError = schedule ? '' : 'Schemat gick inte att ladda från servern.';

  return <ScheduleView initialSchedule={schedule} initialError={initialError} />;
}
