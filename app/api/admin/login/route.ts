import { NextResponse } from 'next/server';
import {
  getSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  validateCredentials,
} from '../../../lib/admin-auth';

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { username?: string; password?: string }
    | null;

  const username = String(payload?.username || '');
  const password = String(payload?.password || '');

  if (!validateCredentials(username, password)) {
    return NextResponse.json({ error: 'Fel anvandarnamn eller losenord.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, getSessionToken(), sessionCookieOptions());

  return response;
}
