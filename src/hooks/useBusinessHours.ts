'use client';

import { useEffect, useState } from 'react';
import {
  type BusinessHours,
  type OpenState,
  DEFAULT_BUSINESS_HOURS,
  computeOpenState,
  normalizeBusinessHours,
} from '@/lib/business-hours';

interface UseBusinessHoursResult {
  config: BusinessHours;
  state: OpenState;
  loading: boolean;
}

/**
 * Client hook for business-hours UX.
 * Fetches the configured hours once, then recomputes open/closed state
 * (and the opens-in countdown) locally every 30s so the banner stays live.
 * Enforcement is server-side (DB trigger) — this drives UI only.
 */
// Optimistic initial state: assume OPEN until the real config loads.
// The DB trigger is the true enforcement, so the client should never block
// ordering based on unloaded hours (which would otherwise flash "closed"
// whenever the current time is outside the hardcoded default window).
const OPTIMISTIC_OPEN: OpenState = { isOpen: true, reason: 'open', minutesUntilOpen: null };

export function useBusinessHours(): UseBusinessHoursResult {
  const [config, setConfig] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [state, setState] = useState<OpenState>(OPTIMISTIC_OPEN);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch('/api/store/business-hours', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.config) {
          const normalized = normalizeBusinessHours(data.config);
          setConfig(normalized);
          setState(computeOpenState(normalized));
          setLoaded(true);
        }
      })
      .catch(() => {
        /* fail open — keep optimistic state */
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Recompute locally on a timer so the countdown ticks and the store flips
  // open/closed at the boundary without a refetch.
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(() => {
      setState(computeOpenState(config));
    }, 30_000);
    return () => clearInterval(id);
  }, [config, loaded]);

  return { config, state, loading };
}
