import { createHmac } from 'crypto';

const SECRET = process.env.ADMIN_SESSION_SECRET || 'pol-admin-secret-key-change-in-prod';
const COOKIE_NAME = 'pol_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface SessionPayload {
  role: 'admin';
  exp: number;
}

export function createSessionToken(): string {
  const payload: SessionPayload = {
    role: 'admin',
    exp: Date.now() + SESSION_DURATION,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return false;

    const expectedSignature = createHmac('sha256', SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return false;

    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.role !== 'admin') return false;
    if (payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

export function verifyPin(pin: string): boolean {
  const correctPin = process.env.ADMIN_PIN || '1234';
  return pin === correctPin;
}

export { COOKIE_NAME };
