'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

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
      const data = await response.json();

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

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-sm text-slate-300">
          Kontrollerar adminsession...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Admin</p>
          <h1 className="text-3xl font-semibold">Ladda upp veckans Excel-schema</h1>
          <p className="text-sm leading-7 text-slate-400">
            Ange vecka, datumstart samt tider en gång här. Ladda sedan upp en Excel-fil som följer mallen. Det publika schemat uppdateras direkt efter uppladdning.
          </p>
        </div>

        {isAuthenticated ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/template"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
              >
                Ladda ner Excel-mall
              </a>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Logga ut
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block rounded-2xl border border-white/10 bg-slate-800/80 p-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Veckonummer</span>
                  <input
                    type="number"
                    min="1"
                    value={weekNumber}
                    onChange={(event) => setWeekNumber(event.target.value)}
                    placeholder="Ex. 32"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-0"
                  />
                </label>

                <label className="block rounded-2xl border border-white/10 bg-slate-800/80 p-4">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Veckostart</span>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(event) => setWeekStartDate(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-0"
                  />
                </label>
              </div>

              <label className="block rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-500/10 p-4">
                <span className="mb-2 block text-sm font-semibold text-emerald-200">Excel-fil</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="w-full text-sm text-slate-200" />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? 'Laddar upp...' : 'Importera schema'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block rounded-2xl border border-white/10 bg-slate-800/80 p-4">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Admin-användarnamn</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ange användarnamn"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-0"
              />
            </label>

            <label className="block rounded-2xl border border-white/10 bg-slate-800/80 p-4">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Admin-lösenord</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ange lösenord"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-0"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        )}

        {status ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{status}</p> : null}

        <Link href="/" className="text-sm font-semibold text-slate-300 transition hover:text-white">
          ← Tillbaka till publikt schema
        </Link>
      </div>
    </div>
  );
}
