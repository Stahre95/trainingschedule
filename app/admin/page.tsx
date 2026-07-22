'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

function getIsoWeekNumberFromDate(value: string) {
  const [rawYear, rawMonth, rawDay] = value.split('-');
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (!year || !month || !day) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default function AdminPage() {
  // Adminpanelen används för att logga in och ladda upp veckans schema.
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [weekNumber, setWeekNumber] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('');
  const hasErrorStatus = /misslyck|välj|fel|error/i.test(status);

  useEffect(() => {
    // Kontrollerar om en giltig admins-session redan finns i webbläsaren.
    async function checkSession() {
      try {
        const response = await fetch('/api/admin/session');
        const data = (await response.json()) as { authenticated?: boolean };
        setIsAuthenticated(Boolean(data.authenticated));
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkSession();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    // Skickar inloggningsuppgifter till servern och får en session-cookie vid lyckad inloggning.
    event.preventDefault();
    setStatus('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Inloggning misslyckades.');
      }

      setIsAuthenticated(true);
      setPassword('');
      setStatus('Inloggad. Du kan nu ladda upp veckoschemat.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Inloggning misslyckades.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    // Tar bort admins-sessionen från servern.
    setStatus('');
    setIsLoading(true);

    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUsername('');
      setPassword('');
      setFile(null);
      setStatus('Utloggad.');
      setWeekNumber('');
      setWeekStartDate('');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Laddar upp Excel-filen när admin redan är inloggad.
    event.preventDefault();
    setStatus('');

    if (!file) {
      setStatus('Välj en Excel-fil först.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (weekNumber.trim()) {
      formData.append('weekNumber', weekNumber.trim());
    }
    if (weekStartDate.trim()) {
      formData.append('weekStartDate', weekStartDate.trim());
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const responseText = await response.text();
      const data = responseText ? (JSON.parse(responseText) as { ok?: boolean; bookings?: number; error?: string }) : {};

      if (!response.ok) {
        throw new Error(data.error || 'Uppladdning misslyckades.');
      }

      setStatus(`Laddade upp ${data.bookings} bokningar. Det publika schemat är nu uppdaterat.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Uppladdning misslyckades.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    // Sparar vald fil i state så den kan skickas till uppladdningen.
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  }

  function handleWeekStartDateChange(event: ChangeEvent<HTMLInputElement>) {
    const nextWeekStartDate = event.target.value;
    setWeekStartDate(nextWeekStartDate);

    if (!nextWeekStartDate) {
      setWeekNumber('');
      return;
    }

    const derivedWeekNumber = getIsoWeekNumberFromDate(nextWeekStartDate);
    setWeekNumber(derivedWeekNumber ? String(derivedWeekNumber) : '');
  }

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-10 text-slate-900">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/45 bg-white/74 p-8 text-sm text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-md">
          Kontrollerar adminsession...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-10 text-slate-900">
      <div className="flex w-full max-w-3xl flex-col gap-6 rounded-[2rem] border border-white/45 bg-white/76 p-8 shadow-2xl shadow-slate-900/15 backdrop-blur-md">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-800">Admin</p>
          <h1 className="text-3xl font-semibold text-slate-950">Ladda upp veckans schema</h1>
          <p className="text-sm leading-7 text-slate-700">
            Ange datum för veckans start och ladda upp en excel-fil med bokningar. Du kan även ladda ner en mall för att fylla i bokningarna.
          </p>
        </div>

        {isAuthenticated ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/template"
                className="rounded-full border border-sky-200 bg-sky-50/80 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-50"
              >
                Ladda ner Excel-mall
              </a>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="rounded-full border border-rose-300 bg-rose-100/85 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Logga ut
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-1">
                <label className="block rounded-2xl border border-sky-100/90 bg-white/62 p-4 shadow-sm shadow-slate-900/5">
                  <span className="mb-2 block text-sm font-semibold text-slate-800">Datum för veckans start</span>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={handleWeekStartDateChange}
                    className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0"
                  />
                </label>
              </div>

              <label className="block rounded-2xl border border-dashed border-sky-200 bg-sky-50/72 p-4">
                <span className="mb-2 block text-sm font-semibold text-sky-950">Excel-fil</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="w-full text-sm text-slate-800" />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Laddar upp...' : 'Importera schema'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block rounded-2xl border border-sky-100/90 bg-white/62 p-4 shadow-sm shadow-slate-900/5">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Admin-användarnamn</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ange användarnamn"
                className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
            </label>

            <label className="block rounded-2xl border border-sky-100/90 bg-white/62 p-4 shadow-sm shadow-slate-900/5">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Admin-lösenord</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ange lösenord"
                className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        )}

        {status ? (
          <p
            className={
              hasErrorStatus
                ? 'rounded-2xl border border-rose-200 bg-rose-50/85 p-3 text-sm text-rose-900'
                : 'rounded-2xl border border-emerald-200 bg-emerald-50/85 p-3 text-sm text-emerald-900'
            }
          >
            {status}
          </p>
        ) : null}

        <Link href="/" className="text-sm font-semibold text-sky-900 transition hover:text-sky-700">
          ← Tillbaka till schemat
        </Link>
      </div>
    </div>
  );
}
