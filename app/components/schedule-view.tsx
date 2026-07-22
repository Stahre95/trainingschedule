'use client';

import { useEffect, useMemo, useState } from 'react';
import { type ScheduleBooking, type ScheduleData, weekdayOrder } from '../lib/schedule';

const pitchRows = ['Ringvallen 1', 'Ringvallen 2', 'Ringvallen 3', 'Ringvallen 4'] as const;
const viewRotationMs = 15_000;

const dayLabels: Record<(typeof weekdayOrder)[number], string> = {
  Monday: 'Måndag',
  Tuesday: 'Tisdag',
  Wednesday: 'Onsdag',
  Thursday: 'Torsdag',
  Friday: 'Fredag',
  Saturday: 'Lördag',
  Sunday: 'Söndag',
};

const dayAliasMap: Record<string, (typeof weekdayOrder)[number]> = {
  monday: 'Monday',
  mandag: 'Monday',
  tuesday: 'Tuesday',
  tisdag: 'Tuesday',
  wednesday: 'Wednesday',
  onsdag: 'Wednesday',
  thursday: 'Thursday',
  torsdag: 'Thursday',
  friday: 'Friday',
  fredag: 'Friday',
  saturday: 'Saturday',
  lordag: 'Saturday',
  sunday: 'Sunday',
  sondag: 'Sunday',
};

function normalizeWord(value: string) {
  // Normaliserar text så svenska/engelska namn och accenter kan jämföras säkert.
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeDay(value: string): (typeof weekdayOrder)[number] | null {
  return dayAliasMap[normalizeWord(value)] ?? null;
}

function getPitchNumber(value: string) {
  // Hämtar siffran i planens namn så vi kan matcha Ringvallen 1-4 även om texten varierar.
  const normalized = normalizeWord(value);
  const matches = [...normalized.matchAll(/[1-4]/g)].map((match) => Number(match[0]));
  return new Set(matches);
}

function matchesPitch(bookingPitch: string, targetPitch: string) {
  // Avgör om en bokning hör till en viss plankolumn.
  const targetNumber = Number(targetPitch.replace(/\D/g, ''));
  const bookingNumbers = getPitchNumber(bookingPitch);

  if (bookingNumbers.size === 0) {
    return normalizeWord(bookingPitch) === normalizeWord(targetPitch);
  }

  return bookingNumbers.has(targetNumber);
}

function inferHalf(booking: ScheduleBooking): 'A' | 'B' {
  // Försöker lista ut om en enkelbokning ska visas på A- eller B-halvan.
  if (booking.halfSide) {
    return booking.halfSide;
  }

  const signal = normalizeWord(`${booking.notes ?? ''} ${booking.pitch}`);
  if (/\bb\b|half b|side b|plan b|halva b|sida b/.test(signal)) {
    return 'B';
  }
  return 'A';
}

function timeToMinutes(time: string) {
  // Gör om HH:MM till ett tal så tiderna kan sorteras kronologiskt.
  const [rawHours, rawMinutes] = time.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return hours * 60 + minutes;
}

type TimeSlot = {
  time: string;
  doubles: ScheduleBooking[];
  singleA: ScheduleBooking[];
  singleB: ScheduleBooking[];
};

type DisplayMode = 'week' | 'today';

function buildTimeline(bookings: ScheduleBooking[]) {
  // Grupperar bokningar per tid och delar upp dem i helplan, A och B för layouten.
  const byTime = new Map<string, TimeSlot>();

  for (const booking of bookings) {
    const slot = byTime.get(booking.time) ?? {
      time: booking.time,
      doubles: [],
      singleA: [],
      singleB: [],
    };

    if (booking.span === 'double') {
      slot.doubles.push(booking);
    } else if (inferHalf(booking) === 'A') {
      slot.singleA.push(booking);
    } else {
      slot.singleB.push(booking);
    }

    byTime.set(booking.time, slot);
  }

  return [...byTime.values()].sort((left, right) => timeToMinutes(left.time) - timeToMinutes(right.time));
}

function BookingCard({ booking, density = 'compact' }: { booking: ScheduleBooking; density?: 'compact' | 'comfortable' }) {
  // Visar en kompakt bokningsrad med lag och omklädningsrum.
  const matchup = booking.team2 ? `${booking.team1} vs ${booking.team2}` : booking.team1;
  const lockerLine = booking.locker2 ? `${booking.locker1} / ${booking.locker2}` : booking.locker1;
  const isComfortable = density === 'comfortable';

  return (
    <article
      className={
        isComfortable
          ? 'min-w-0 rounded-xl border border-sky-800/20 bg-white/92 px-3 py-2 text-sm text-slate-800 shadow-sm shadow-slate-900/8'
          : 'min-w-0 rounded-md border border-sky-800/20 bg-white/88 px-2.5 py-2 text-xs text-slate-800 shadow-sm shadow-slate-900/8'
      }
    >
      <p className={isComfortable ? 'truncate font-semibold leading-tight text-slate-950' : 'truncate font-semibold leading-tight text-slate-950'}>{matchup}</p>
      <p className={isComfortable ? 'truncate text-xs leading-tight text-slate-700' : 'truncate text-[11px] leading-tight text-slate-700'}>{lockerLine}</p>
    </article>
  );
}

function PitchDayCell({ bookings }: { bookings: ScheduleBooking[] }) {
  // Renderar alla bokningar för en specifik plan och dag i kronologisk ordning.
  const timeline = buildTimeline(bookings);
  const isEmpty = timeline.length === 0;

  return (
    <div className="min-w-0 rounded-xl border border-cyan-800/12 bg-cyan-100/26 p-1 backdrop-blur-sm">
      <div className="grid min-h-[86px] grid-cols-1 gap-1 content-start">
        {timeline.map((slot) => (
          <div key={slot.time} className="min-w-0 rounded-md border border-slate-700/10 bg-white/28 p-1.5">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-900">
              {slot.time}–{slot.doubles[0]?.endTime ?? slot.singleA[0]?.endTime ?? slot.singleB[0]?.endTime ?? slot.time}
            </p>

            <div className="space-y-1">
              {slot.doubles.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>

            {slot.singleA.length > 0 || slot.singleB.length > 0 ? (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="space-y-1">
                  {slot.singleA.map((booking) => (
                    <div key={booking.id}>
                      <BookingCard booking={booking} />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  {slot.singleB.map((booking) => (
                    <div key={booking.id}>
                      <BookingCard booking={booking} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {isEmpty ? <div className="col-span-2 rounded-lg bg-white/18" /> : null}
      </div>
    </div>
  );
}

function TodayPitchPanel({
  pitch,
  dayLabel,
  dateLabel,
  bookings,
}: {
  pitch: string;
  dayLabel: string;
  dateLabel: string;
  bookings: ScheduleBooking[];
}) {
  const timeline = buildTimeline(bookings);

  return (
    <section className="flex h-[80vh] flex-col rounded-[1.75rem] border border-cyan-700/18 bg-white/30 p-4 shadow-lg shadow-slate-900/6 backdrop-blur-sm">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-cyan-800/10 pb-3">
        <div>
          <p className="text-[clamp(1.15rem,2vw,1.65rem)] font-bold leading-tight text-slate-950">{pitch}</p>
          <p className="text-sm font-semibold text-slate-700">
            {dayLabel} {dateLabel}
          </p>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-sky-700/18 bg-white/38 px-4 text-center text-base font-medium text-slate-600">
          Inga bokningar idag för denna plan.
        </div>
      ) : (
        <div className="grid flex-1 content-start gap-3 overflow-y-auto pr-1">
          {timeline.map((slot) => (
            <div key={`${pitch}-${slot.time}`} className="rounded-2xl border border-slate-700/10 bg-white/45 p-3">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-900">
                {slot.time}-{slot.doubles[0]?.endTime ?? slot.singleA[0]?.endTime ?? slot.singleB[0]?.endTime ?? slot.time}
              </p>

              {slot.doubles.length > 0 ? (
                <div className="space-y-2">
                  {slot.doubles.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} density="comfortable" />
                  ))}
                </div>
              ) : null}

              {slot.singleA.length > 0 || slot.singleB.length > 0 ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Halva A</p>
                    {slot.singleA.length > 0 ? (
                      slot.singleA.map((booking) => <BookingCard key={booking.id} booking={booking} density="comfortable" />)
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2 text-xs text-slate-500">Ingen bokning</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Halva B</p>
                    {slot.singleB.length > 0 ? (
                      slot.singleB.map((booking) => <BookingCard key={booking.id} booking={booking} density="comfortable" />)
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-3 py-2 text-xs text-slate-500">Ingen bokning</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getIsoWeekNumber(date: Date) {
  // Räknar ISO-vecka så veckonumret stämmer med svensk kalender.
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getStartOfIsoWeek(referenceDate: Date) {
  // Flyttar ett datum tillbaka till måndagen i samma ISO-vecka.
  const date = new Date(referenceDate);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getCurrentWeekdayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getActiveDayIndex(weekStartDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);

  const difference = Math.round((today.getTime() - weekStart.getTime()) / 86400000);
  if (difference >= 0 && difference < weekdayOrder.length) {
    return difference;
  }

  return getCurrentWeekdayIndex();
}

function formatWeekdayDate(startDate: Date, dayIndex: number) {
  // Skapar datumetiketten som visas under varje veckodag.
  const date = new Date(startDate);
  date.setDate(startDate.getDate() + dayIndex);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatUpdatedTimestamp(value: string) {
  // Formaterar senaste uppdatering på ett stabilt sätt för svensk tidszon.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(parsed);
}

type ScheduleViewProps = {
  initialSchedule: ScheduleData | null;
  initialError?: string;
};

function detectLegacyMode() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const supports = typeof CSS !== 'undefined' && typeof CSS.supports === 'function';
  const hasGridSupport = supports ? CSS.supports('display', 'grid') : false;
  const hasContentsSupport = supports ? CSS.supports('display', 'contents') : false;
  const hasClampSupport = supports ? CSS.supports('width', 'clamp(10px, 5vw, 20px)') : false;

  let tailwindGridApplied = false;
  const probe = document.createElement('div');
  probe.className = 'grid';
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  try {
    tailwindGridApplied = getComputedStyle(probe).display === 'grid';
  } finally {
    probe.remove();
  }

  return !tailwindGridApplied || !hasGridSupport || !hasContentsSupport || !hasClampSupport;
}

export function ScheduleView({ initialSchedule, initialError }: ScheduleViewProps) {
  // Huvudvyn som hämtar schemat och bygger hela TV-layouten.
  const [schedule, setSchedule] = useState<ScheduleData | null>(initialSchedule);
  const [loading, setLoading] = useState(!initialSchedule);
  const [loadError, setLoadError] = useState(initialError ?? '');
  const [lastAttemptAt, setLastAttemptAt] = useState<string>('');
  const [legacyMode] = useState(() => detectLegacyMode());
  const [activeView, setActiveView] = useState<DisplayMode>('week');

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadSchedule() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort('timeout');
      }, 12000);

      try {
        const response = await fetch('/api/schedule', { cache: 'no-store', signal: controller.signal });
        const data = (await response.json()) as
          | ScheduleData
          | {
              ok: false;
              error?: string;
            };

        if (!response.ok) {
          const errorMessage =
            typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
              ? data.error
              : 'Schemat gick inte att ladda.';
          throw new Error(errorMessage);
        }

        if (active) {
          setSchedule(data as ScheduleData);
          setLoadError('');
          setLastAttemptAt(new Date().toISOString());
        }
      } catch (error) {
        const isTimeout = error instanceof DOMException && error.name === 'AbortError';
        const message = isTimeout
          ? 'Nätverksförfrågan till schemat tog för lång tid (timeout).'
          : error instanceof Error
            ? error.message
            : 'Schemat gick inte att ladda.';

        if (active) {
          setLoadError(message);
          setLastAttemptAt(new Date().toISOString());
        }
      } finally {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSchedule();
    intervalId = setInterval(() => {
      loadSchedule();
    }, 60_000);

    return () => {
      active = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveView((currentView) => (currentView === 'week' ? 'today' : 'week'));
    }, viewRotationMs);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const matrix = useMemo<ScheduleBooking[][][]>(() => {
    if (!schedule) {
      return [];
    }

    return pitchRows.map((pitch) => {
      return weekdayOrder.map((day) => {
        return schedule.bookings.filter((booking) => normalizeDay(booking.day) === day && matchesPitch(booking.pitch, pitch));
      });
    });
  }, [schedule]);

  const weekNumber = useMemo(() => {
    if (!schedule) {
      return getIsoWeekNumber(new Date());
    }

    if (schedule.weekNumber) {
      return schedule.weekNumber;
    }
    return getIsoWeekNumber(new Date());
  }, [schedule]);

  const weekStartDate = useMemo(() => {
    if (!schedule) {
      return getStartOfIsoWeek(new Date());
    }

    if (schedule.weekStartDate) {
      const parsed = new Date(schedule.weekStartDate);
      if (!Number.isNaN(parsed.getTime())) {
        return getStartOfIsoWeek(parsed);
      }
    }
    return getStartOfIsoWeek(new Date());
  }, [schedule]);

  const activeDayIndex = useMemo(() => getActiveDayIndex(weekStartDate), [weekStartDate]);

  const activeDay = weekdayOrder[activeDayIndex] ?? 'Monday';

  const todayPitchData = useMemo(() => {
    if (!schedule) {
      return [] as Array<{ pitch: string; bookings: ScheduleBooking[] }>;
    }

    return pitchRows.map((pitch, pitchIndex) => ({
      pitch,
      bookings: matrix[pitchIndex]?.[activeDayIndex] ?? [],
    }));
  }, [activeDayIndex, matrix, schedule]);

  const legacyPitchData = useMemo(() => {
    if (!schedule) {
      return [] as Array<{
        pitch: string;
        perDay: Array<{ dayLabel: string; dateLabel: string; bookings: ScheduleBooking[] }>;
      }>;
    }

    return pitchRows.map((pitch) => ({
      pitch,
      perDay: weekdayOrder.map((day, dayIndex) => ({
        dayLabel: dayLabels[day],
        dateLabel: formatWeekdayDate(weekStartDate, dayIndex),
        bookings: schedule.bookings.filter((booking) => normalizeDay(booking.day) === day && matchesPitch(booking.pitch, pitch)),
      })),
    }));
  }, [schedule, weekStartDate]);

  if (!schedule) {
    return (
      <div className="mx-auto flex h-screen w-screen items-center justify-center bg-transparent p-6 text-slate-950">
        <div className="max-w-[920px] rounded-2xl border border-white/45 bg-white/72 px-8 py-6 text-center shadow-xl shadow-slate-900/10 backdrop-blur-md">
          <p className="text-2xl font-bold text-slate-950">Schemat gick inte att ladda.</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{loading ? 'Försöker hämta schema...' : loadError || 'Kontakta administratör.'}</p>
          <p className="mt-4 text-xs text-slate-600">
            Diagnostik: {lastAttemptAt ? `Senaste försök ${formatUpdatedTimestamp(lastAttemptAt)}.` : 'Inget svar ännu.'}
          </p>
          <p className="mt-1 text-xs text-slate-600">Testa att öppna /api/schedule direkt i TV-webbläsaren.</p>
        </div>
      </div>
    );
  }

  if (legacyMode) {
    return (
      <div style={{ margin: '0 auto', width: '100%', maxWidth: '100%', padding: '12px', color: '#0f172a', boxSizing: 'border-box' }}>
        <div style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(15,23,42,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>Ringvallen IP schema</div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>Aktiviteter för veckan - Vecka {weekNumber}</div>
          {loadError ? <div style={{ marginTop: '6px', fontSize: '12px', color: '#92400e' }}>Info: {loadError}</div> : null}
        </div>

        <div style={{ marginTop: '10px', overflowX: 'auto', background: 'rgba(255,255,255,0.84)', border: '1px solid rgba(15,23,42,0.15)', borderRadius: '10px', padding: '10px' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1280px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #94a3b8', padding: '8px', fontSize: '14px' }}>Plan</th>
                {weekdayOrder.map((day, dayIndex) => (
                  <th key={day} style={{ textAlign: 'left', borderBottom: '1px solid #94a3b8', padding: '8px', fontSize: '13px' }}>
                    {dayLabels[day]} {formatWeekdayDate(weekStartDate, dayIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legacyPitchData.map((pitchRow) => (
                <tr key={pitchRow.pitch}>
                  <td style={{ verticalAlign: 'top', borderBottom: '1px solid #cbd5e1', padding: '8px', fontWeight: 700 }}>{pitchRow.pitch}</td>
                  {pitchRow.perDay.map((dayRow) => (
                    <td key={`${pitchRow.pitch}-${dayRow.dayLabel}`} style={{ verticalAlign: 'top', borderBottom: '1px solid #cbd5e1', padding: '8px' }}>
                      {dayRow.bookings.length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '12px' }}>-</div>
                      ) : (
                        <div>
                          {buildTimeline(dayRow.bookings).map((slot) => (
                            <div key={`${pitchRow.pitch}-${dayRow.dayLabel}-${slot.time}`} style={{ marginBottom: '8px', fontSize: '12px', lineHeight: 1.35 }}>
                              <div style={{ fontWeight: 700 }}>
                                {slot.time}-{slot.doubles[0]?.endTime ?? slot.singleA[0]?.endTime ?? slot.singleB[0]?.endTime ?? slot.time}
                              </div>
                              {[...slot.doubles, ...slot.singleA, ...slot.singleB].map((booking) => (
                                <div key={booking.id}>
                                  {booking.team2 ? `${booking.team1} vs ${booking.team2}` : booking.team1}
                                  {booking.locker1 ? ` (${booking.locker2 ? `${booking.locker1} / ${booking.locker2}` : booking.locker1})` : ''}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155', background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '8px', padding: '8px 10px' }}>
          Uppdaterad: {formatUpdatedTimestamp(schedule.lastUpdated)}
          {lastAttemptAt ? ` | Senaste synk: ${formatUpdatedTimestamp(lastAttemptAt)}` : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-[99vw] max-w-[99vw] flex-col gap-2 bg-transparent p-1 text-slate-950 lg:p-2">
        <header className="rounded-2xl border border-white/35 bg-white/44 p-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-800">Ringvallen schema</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 xl:text-3xl">
                {activeView === 'week' ? 'Aktiviter för veckan' : 'Dagens aktiviteter'}
              </h1>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-full border border-sky-700/30 bg-sky-100/85 px-3 py-1.5 text-xs font-semibold text-sky-900">
                Vecka {weekNumber}
              </div>
            </div>
          </div>
        </header>

        <main className="overflow-hidden rounded-2xl border border-white/35 bg-white/26 p-1.5">
          {activeView === 'week' ? (
            <div className="grid grid-cols-[clamp(96px,11.5vw,178px)_repeat(7,minmax(0,1fr))] grid-rows-[70px_repeat(4,auto)] content-start gap-x-1 gap-y-[7px]">
              <div className="flex h-[70px] min-w-0 items-center justify-center rounded-xl border border-sky-700/20 bg-sky-200/58 px-2 py-1.5 text-center text-base font-semibold text-slate-950">Plan</div>

              {weekdayOrder.map((day) => (
                <div
                  key={day}
                  className="flex h-[70px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-cyan-700/18 bg-cyan-100/50 px-2 py-1 text-slate-950"
                >
                  <p className="text-center text-[clamp(1.02rem,1.55vw,1.22rem)] font-bold leading-none">{dayLabels[day]}</p>
                  <p className="text-center text-xs font-semibold leading-none text-slate-800">{formatWeekdayDate(weekStartDate, weekdayOrder.indexOf(day))}</p>
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border border-cyan-800/10 text-center text-[11px] font-semibold leading-none text-slate-900">
                    <span className="border-r border-cyan-800/10 bg-cyan-50/44 py-[4px] pb-[6px]">A</span>
                    <span className="bg-cyan-50/44 py-[4px] pb-[6px]">B</span>
                  </div>
                </div>
              ))}

              {pitchRows.map((pitch, pitchIndex) => (
                <div key={pitch} className="contents">
                  <div
                    key={`${pitch}-label`}
                    className="flex min-w-0 items-center justify-center rounded-xl border border-sky-700/20 bg-sky-200/58 px-2 py-2 text-center text-slate-950"
                  >
                    <div className="my-auto w-full">
                      <p className="text-[clamp(1.08rem,1.95vw,1.6rem)] font-bold leading-tight">{pitch}</p>
                    </div>
                  </div>

                  {weekdayOrder.map((day, dayIndex) => (
                    <PitchDayCell key={`${pitch}-${day}`} bookings={matrix[pitchIndex][dayIndex]} />
                  ))}
                </div>
              ))}

              {loading ? (
                <div className="col-span-8 rounded-xl border border-sky-700/25 bg-white/34 p-2 text-center text-sm text-sky-950">
                  Laddar senaste schemat...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {todayPitchData.map((pitchData) => (
                <TodayPitchPanel
                  key={`${pitchData.pitch}-${activeDay}`}
                  pitch={pitchData.pitch}
                  dayLabel={dayLabels[activeDay]}
                  dateLabel={formatWeekdayDate(weekStartDate, activeDayIndex)}
                  bookings={pitchData.bookings}
                />
              ))}
            </div>
          )}
        </main>

        <footer className="rounded-2xl border border-white/35 bg-white/44 px-3 py-1.5 text-[11px] text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-sky-900">Uppdaterad: {formatUpdatedTimestamp(schedule.lastUpdated)}</p>
            {activeView === 'today' ? <p className="text-slate-600">Växlar vy automatiskt var 15:e sekund.</p> : null}
          </div>
        </footer>
    </div>
  );
}
