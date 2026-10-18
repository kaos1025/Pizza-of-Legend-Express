import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'pol_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// 개발 편의용 기본값. 운영(NODE_ENV=production)에서는 절대 사용되지 않는다 — 아래 getAdminConfig 참고.
const DEV_FALLBACK_PIN = '1234';
const DEV_FALLBACK_SECRET = 'pol-admin-secret-key-change-in-prod';

interface SessionPayload {
  role: 'admin';
  exp: number;
}

interface AdminConfig {
  pin: string;
  secret: string;
}

let warnedDevFallback = false;

/**
 * ADMIN_PIN / ADMIN_SESSION_SECRET 을 읽는다.
 * - 운영: 둘 중 하나라도 비어 있으면 null → 로그인·세션 검증이 전부 실패(fail-closed).
 *   예전처럼 기본 PIN 1234 로 열리는 일이 없도록 한다.
 * - 개발: 비어 있으면 기본값 사용 + 1회 경고.
 * 모듈 로드 시점이 아니라 호출 시점에 읽는다 — Cloudflare Workers(OpenNext) 는 요청 컨텍스트에서
 * process.env 를 채우므로 모듈 레벨 상수로 캐시하면 빈 값이 박힐 수 있다.
 */
function getAdminConfig(): AdminConfig | null {
  const pin = process.env.ADMIN_PIN;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (pin && secret) return { pin, secret };

  if (process.env.NODE_ENV === 'production') return null;

  if (!warnedDevFallback) {
    warnedDevFallback = true;
    console.warn('[admin] ADMIN_PIN / ADMIN_SESSION_SECRET 미설정 — 개발용 기본값 사용 중');
  }
  return { pin: pin || DEV_FALLBACK_PIN, secret: secret || DEV_FALLBACK_SECRET };
}

/** 운영 환경에서 관리자 시크릿이 등록됐는지. auth 라우트가 503 을 돌려줄 때 쓴다. */
export function isAdminConfigured(): boolean {
  return getAdminConfig() !== null;
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function createSessionToken(): string {
  const config = getAdminConfig();
  if (!config) throw new Error('Admin session secret is not configured');

  const payload: SessionPayload = {
    role: 'admin',
    exp: Date.now() + SESSION_DURATION,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data, config.secret)}`;
}

export function verifySessionToken(token: string): boolean {
  const config = getAdminConfig();
  if (!config) return false;

  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return false;

    if (!safeEqual(signature, sign(data, config.secret))) return false;

    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.role !== 'admin') return false;
    if (payload.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

export function verifyPin(pin: string): boolean {
  const config = getAdminConfig();
  if (!config) return false;
  return safeEqual(pin, config.pin);
}

export { COOKIE_NAME };
