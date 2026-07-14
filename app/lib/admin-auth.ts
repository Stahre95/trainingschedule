import { createHash, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'admin_session';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ringvallen1930!';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change-this-secret-in-production';

const sessionPayload = `${ADMIN_USERNAME}:${ADMIN_PASSWORD}:${ADMIN_SESSION_SECRET}`;
const SESSION_TOKEN = createHash('sha256').update(sessionPayload).digest('hex');

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateCredentials(username: string, password: string) {
  return safeCompare(username, ADMIN_USERNAME) && safeCompare(password, ADMIN_PASSWORD);
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  return safeCompare(token, SESSION_TOKEN);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export function getSessionToken() {
  return SESSION_TOKEN;
}
