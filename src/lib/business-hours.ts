/**
 * Business hours — shared types + Asia/Seoul open/closed computation.
 *
 * Stored in store_settings under the 'business_hours' key (JSONB).
 * The DB trigger (check_business_hours) is the source of truth for enforcement;
 * this module powers the client/admin UX only.
 */

export interface BusinessHours {
  /** Whether business-hours blocking is active. false => 24h ordering allowed. */
  enabled: boolean;
  /** Opening time "HH:MM" (24h). */
  open: string;
  /** Closing time "HH:MM" (24h). "24:00" means midnight (end of business day). */
  close: string;
  /** IANA timezone — orders are judged in this zone. */
  timezone: string;
  /** Manual temporary-closure switch. true => closed regardless of schedule. */
  manual_closed: boolean;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  enabled: true,
  open: '12:00',
  close: '24:00',
  timezone: 'Asia/Seoul',
  manual_closed: false,
};

export type ClosedReason = 'open' | 'closed_hours' | 'closed_manual' | 'disabled';

export interface OpenState {
  isOpen: boolean;
  reason: ClosedReason;
  /** Minutes until the next opening; null when open, disabled, or manually closed. */
  minutesUntilOpen: number | null;
}

/** Normalize a partial/unknown value into a complete BusinessHours object. */
export function normalizeBusinessHours(value: Partial<BusinessHours> | null | undefined): BusinessHours {
  if (!value) return { ...DEFAULT_BUSINESS_HOURS };
  return {
    enabled: value.enabled !== false,
    open: typeof value.open === 'string' ? value.open : DEFAULT_BUSINESS_HOURS.open,
    close: typeof value.close === 'string' ? value.close : DEFAULT_BUSINESS_HOURS.close,
    timezone: typeof value.timezone === 'string' ? value.timezone : DEFAULT_BUSINESS_HOURS.timezone,
    manual_closed: value.manual_closed === true,
  };
}

/** Parse "HH:MM" to minutes since midnight. "24:00" => 1440. */
function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Current minutes-since-midnight in the given IANA timezone. */
export function nowMinutesInTz(timezone: string, date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'Asia/Seoul',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/**
 * Compute open/closed state from business hours, in the configured timezone.
 * Mirrors the SQL trigger logic (close > open => same-day window,
 * close <= open => midnight-crossing window).
 */
export function computeOpenState(bh: BusinessHours, date: Date = new Date()): OpenState {
  if (!bh.enabled) return { isOpen: true, reason: 'disabled', minutesUntilOpen: null };
  if (bh.manual_closed) return { isOpen: false, reason: 'closed_manual', minutesUntilOpen: null };

  const now = nowMinutesInTz(bh.timezone, date);
  const open = toMinutes(bh.open);
  const close = toMinutes(bh.close);

  const isOpen = close > open ? now >= open && now < close : now >= open || now < close;
  if (isOpen) return { isOpen: true, reason: 'open', minutesUntilOpen: null };

  // Minutes until the next opening (wrap to tomorrow if already past today's open).
  let diff = open - now;
  if (diff <= 0) diff += 24 * 60;
  return { isOpen: false, reason: 'closed_hours', minutesUntilOpen: diff };
}

/** Split a minutes count into {h, m} for display (e.g. countdown). */
export function splitHm(minutes: number): { h: number; m: number } {
  const safe = Math.max(0, Math.round(minutes));
  return { h: Math.floor(safe / 60), m: safe % 60 };
}
