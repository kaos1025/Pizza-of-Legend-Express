interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS = 10;

// Clean up old entries periodically
function cleanup() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  store.forEach((entry, ip) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      keysToDelete.push(ip);
    }
  });
  keysToDelete.forEach((ip) => store.delete(ip));
}

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 10 * 60 * 1000);
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(ip) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Record this request
  entry.timestamps.push(now);
  store.set(ip, entry);

  return { allowed: true, remaining: MAX_REQUESTS - entry.timestamps.length };
}
