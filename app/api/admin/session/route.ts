import { NextResponse } from 'next/server';
import { isValidSessionToken, SESSION_COOKIE_NAME } from '../../../lib/admin-auth';

export async function GET(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')[1];

  return NextResponse.json({ authenticated: isValidSessionToken(token) });
}
