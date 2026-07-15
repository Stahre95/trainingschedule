'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultSchedule, type ScheduleBooking, type ScheduleData, weekdayOrder } from '../lib/schedule';

const pitchRows = ['Ringvallen 1', 'Ringvallen 2', 'Ringvallen 3', 'Ringvallen 4'] as const;

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

function BookingCard({ booking }: { booking: ScheduleBooking }) {
  // Visar en kompakt bokningsrad med lag och omklädningsrum.
  const matchup = booking.team2 ? `${booking.team1} vs ${booking.team2}` : booking.team1;
  const lockerLine = booking.locker2 ? `${booking.locker1} / ${booking.locker2}` : booking.locker1;

  return (
    <article className="rounded-md border border-sky-800/20 bg-white/88 px-2 py-1.5 text-[11px] text-slate-800 shadow-sm shadow-slate-900/8">
      <p className="truncate font-semibold leading-tight text-slate-950">{matchup}</p>
      <p className="truncate text-[10px] leading-tight text-slate-700">{lockerLine}</p>
    </article>
  );
}

function PitchDayCell({ bookings }: { bookings: ScheduleBooking[] }) {
  // Renderar alla bokningar för en specifik plan och dag i kronologisk ordning.
  const timeline = buildTimeline(bookings);
  const isEmpty = timeline.length === 0;

  return (
    <div className="h-full rounded-xl border border-cyan-800/12 bg-cyan-100/26 p-1 backdrop-blur-sm">
      <div className="grid h-full min-h-[72px] grid-cols-1 gap-1 content-start">
        {timeline.map((slot) => (
          <div key={slot.time} className="rounded-md border border-slate-700/10 bg-white/28 p-1">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-900">
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

        {isEmpty ? <div className="col-span-2 rounded-lg border border-dashed border-slate-600/16 bg-white/18" /> : null}
      </div>
    </div>
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

export function ScheduleView() {
  // Huvudvyn som hämtar schemat och bygger hela TV-layouten.
  const [schedule, setSchedule] = useState<ScheduleData>(defaultSchedule);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSchedule() {
      try {
        const response = await fetch('/api/schedule');
        const data = (await response.json()) as ScheduleData;
        if (active) {
          setSchedule(data);
        }
      } catch {
        if (active) {
          setSchedule(defaultSchedule);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => {
      active = false;
    };
  }, []);

  const matrix = useMemo(() => {
    return pitchRows.map((pitch) => {
      return weekdayOrder.map((day) => {
        return schedule.bookings.filter((booking) => normalizeDay(booking.day) === day && matchesPitch(booking.pitch, pitch));
      });
    });
  }, [schedule.bookings]);

  const weekNumber = useMemo(() => {
    if (schedule.weekNumber) {
      return schedule.weekNumber;
    }
    return getIsoWeekNumber(new Date());
  }, [schedule.weekNumber]);

  const weekStartDate = useMemo(() => {
    if (schedule.weekStartDate) {
      const parsed = new Date(schedule.weekStartDate);
      if (!Number.isNaN(parsed.getTime())) {
        return getStartOfIsoWeek(parsed);
      }
    }
    return getStartOfIsoWeek(new Date());
  }, [schedule.weekStartDate]);

  return (
    <div className="mx-auto flex h-[95vh] w-[95vw] flex-col gap-2 overflow-hidden bg-transparent p-2 text-slate-950 lg:p-3">
        <header className="rounded-2xl border border-white/35 bg-white/44 p-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-800">Ringvallen schema</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 xl:text-3xl">Veckoplan för fotbollsplaner</h1>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-full border border-sky-700/30 bg-sky-100/85 px-3 py-1.5 text-xs font-semibold text-sky-900">
                Vecka {weekNumber}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden rounded-2xl border border-white/35 bg-white/26 p-2">
          <div className="grid h-full grid-cols-[minmax(140px,170px)_repeat(7,minmax(150px,1fr))] grid-rows-[62px_repeat(4,minmax(0,1fr))] content-start gap-x-1.5 gap-y-[6px]">
            <div className="flex h-[62px] items-center justify-center rounded-xl border border-sky-700/20 bg-sky-200/58 px-2 py-1.5 text-center text-sm font-semibold text-slate-950">Plan</div>

            {weekdayOrder.map((day) => (
              <div
                key={day}
                className="flex h-[62px] flex-col justify-between overflow-hidden rounded-xl border border-cyan-700/18 bg-cyan-100/50 px-2 py-1 text-slate-950"
              >
                <p className="text-center text-base font-bold leading-none xl:text-lg">{dayLabels[day]}</p>
                <p className="text-center text-[11px] font-semibold leading-none text-slate-800">{formatWeekdayDate(weekStartDate, weekdayOrder.indexOf(day))}</p>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-cyan-800/10 text-center text-[10px] font-semibold leading-none text-slate-900">
                  <span className="border-r border-cyan-800/10 bg-cyan-50/44 py-[3px] pb-[5px]">A</span>
                  <span className="bg-cyan-50/44 py-[3px] pb-[5px]">B</span>
                </div>
              </div>
            ))}

            {pitchRows.map((pitch, pitchIndex) => (
              <div key={pitch} className="contents">
                <div
                  key={`${pitch}-label`}
                  className="flex items-center justify-center rounded-xl border border-sky-700/20 bg-sky-200/58 px-2 py-2 text-center text-slate-950"
                >
                  <div className="my-auto w-full">
                    <p className="text-xl font-bold leading-tight xl:text-2xl">{pitch}</p>
                  </div>
                </div>

                {weekdayOrder.map((day, dayIndex) => (
                  <PitchDayCell key={`${pitch}-${day}`} bookings={matrix[pitchIndex][dayIndex]} />
                ))}
              </div>
            ))}

            {loading ? (
              <div className="col-span-8 rounded-xl border border-dashed border-sky-700/25 bg-white/34 p-2 text-center text-sm text-sky-950">
                Laddar senaste schemat...
              </div>
            ) : null}
          </div>
        </main>

        <footer className="rounded-2xl border border-white/35 bg-white/44 px-3 py-1.5 text-[11px] text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-sky-900">Uppdaterad: {formatUpdatedTimestamp(schedule.lastUpdated)}</p>
          </div>
        </footer>
    </div>
  );
}
