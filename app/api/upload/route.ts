import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { isValidSessionToken, SESSION_COOKIE_NAME } from '../../lib/admin-auth';
import { saveScheduleData } from '../../lib/schedule-storage';
import { type ScheduleBooking, type ScheduleData } from '../../lib/schedule';

function normalizeHeader(value: string) {
  // Normaliserar rubriker så svenska och engelska kolumnnamn kan matchas.
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function getValue(row: Record<string, unknown>, aliases: string[], headerMap: Map<string, string>) {
  // Hämtar första kolumnen som matchar någon av aliasen.
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const matchingHeader = headerMap.get(normalizedAlias);
    if (matchingHeader) {
      return row[matchingHeader];
    }
  }

  return undefined;
}

function detectSpan(usage: string) {
  // Avgör om bokningen ska visas som enkel halva eller över hela planen.
  const normalizedUsage = usage.toLowerCase();

  if (/half|single|one half|halv|halva/i.test(normalizedUsage)) {
    return 'single';
  }

  if (/both|double|full|game|a & b|aandb|hel|helt|match|fullplan|helplan/i.test(normalizedUsage)) {
    return 'double';
  }

  return 'double';
}

function detectHalfSide(usage: string) {
  // Tolkar om en halvplansbokning ska ligga på A eller B.
  const normalizedUsage = usage.toLowerCase();

  if (/\b(halv|half)\s*b\b|\b(halva|side)\s*b\b/.test(normalizedUsage)) {
    return 'B' as const;
  }

  return 'A' as const;
}

export async function POST(request: Request) {
  // Tar emot admin-cookie + uppladdad fil och skriver det nya veckoschemat till disk.
  try {
    const token = request.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split('=')[1];

    if (!isValidSessionToken(token)) {
      return NextResponse.json({ error: 'Obehorig.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const adminWeekNumber = Number(String(formData.get('weekNumber') ?? '').trim());
    const adminWeekStartDate = String(formData.get('weekStartDate') ?? '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Ingen Excel-fil skickades med.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });

    const headerMap = new Map<string, string>();
    const headers = Object.keys(rows[0] ?? {});
    headers.forEach((header) => {
      headerMap.set(normalizeHeader(header), header);
    });

    const bookings = rows
      .map((row, index): ScheduleBooking | null => {
        const day = String(getValue(row, ['day', 'weekday', 'day of week', 'dag', 'veckodag'], headerMap) ?? '').trim();
        const time = String(getValue(row, ['time', 'start time', 'slot', 'timeslot', 'tid', 'starttid'], headerMap) ?? '').trim();
        const endTime = String(getValue(row, ['end time', 'endtime', 'stop time', 'sluttid', 'sluttid'], headerMap) ?? '').trim();
        const pitch = String(getValue(row, ['pitch', 'ringvallen', 'field', 'plan', 'plan nr', 'plan nummer'], headerMap) ?? 'Ringvallen 1').trim();
        const usage = String(getValue(row, ['usage', 'type', 'span', 'half', 'pitch usage', 'anvandning', 'bokningstyp'], headerMap) ?? 'double').trim();
        const team1 = String(getValue(row, ['team 1', 'team1', 'home team', 'home', 'lag 1', 'lag1', 'hemmalag'], headerMap) ?? '').trim();
        const team2 = String(getValue(row, ['team 2', 'team2', 'away team', 'away', 'lag 2', 'lag2', 'bortalag'], headerMap) ?? '').trim() || undefined;
        const locker1 = String(getValue(row, ['locker room team 1', 'locker room 1', 'locker1', 'locker room teamone', 'omkladningsrum lag 1', 'omkladningsrum 1'], headerMap) ?? '').trim();
        const locker2 = String(getValue(row, ['locker room team 2', 'locker room 2', 'locker2', 'locker room teamtwo', 'omkladningsrum lag 2', 'omkladningsrum 2'], headerMap) ?? '').trim() || undefined;

        if (!day || !time || !endTime || !team1) {
          return null;
        }

        return {
          id: `${day.toLowerCase()}-${index}-${time}`,
          day,
          time,
          endTime,
          pitch: pitch || 'Ringvallen 1',
          span: detectSpan(usage),
          halfSide: detectSpan(usage) === 'single' ? detectHalfSide(usage) : undefined,
          team1,
          team2,
          locker1,
          locker2,
        } satisfies ScheduleBooking;
      })
      .filter((booking): booking is ScheduleBooking => booking !== null);

    const firstRow = rows[0] ?? {};
    const rawWeekNumber = getValue(firstRow, ['week', 'week number', 'vecka', 'veckonummer'], headerMap);
    const rawWeekStart = getValue(firstRow, ['week start', 'week start date', 'veckostart', 'veckostart yyyymmdd'], headerMap);

    const parsedWeekNumber = Number(String(rawWeekNumber ?? '').trim());
    const weekNumber = Number.isFinite(adminWeekNumber) && adminWeekNumber > 0
      ? adminWeekNumber
      : (Number.isFinite(parsedWeekNumber) && parsedWeekNumber > 0 ? parsedWeekNumber : undefined);
    const weekStartDate = adminWeekStartDate || String(rawWeekStart ?? '').trim() || undefined;

    const payload: ScheduleData = {
      weekLabel: `Importerad från ${file.name}`,
      weekNumber,
      weekStartDate,
      lastUpdated: new Date().toISOString(),
      bookings,
    };

    try {
      await saveScheduleData(payload);
    } catch {
      return NextResponse.json(
        {
          error: 'Schemat kunde inte sparas. Kontrollera att lagringen i Vercel är konfigurerad.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, bookings: bookings.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Uppladdning misslyckades.',
      },
      { status: 500 },
    );
  }
}
