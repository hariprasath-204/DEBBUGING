let clockOffset = 0;
let isSynced = false;

/**
 * Synchronizes client clock with the authoritative server Date header
 * to ensure all systems show identical remaining timer regardless of local PC clock skew.
 */
export async function syncClock() {
  try {
    const start = Date.now();
    const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
    const dateHeader = res.headers.get('Date');
    if (dateHeader) {
      const serverTime = new Date(dateHeader).getTime();
      const roundTrip = Date.now() - start;
      clockOffset = (serverTime + roundTrip / 2) - Date.now();
      isSynced = true;
    }
  } catch (err) {
    console.warn("Time sync fallback to local clock:", err?.message);
  }
}

/**
 * Returns the current synchronized timestamp in milliseconds.
 */
export function getNow() {
  return Date.now() + clockOffset;
}
