let clockOffset = 0;
let isSynced = false;
let syncPromise = null;

/**
 * Synchronizes client clock with the authoritative backend server time
 * to ensure all client systems display the exact same remaining countdown timer.
 */
export async function syncClock() {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const start = Date.now();
      const res = await fetch(`/api/time?t=${start}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.now) {
          const roundTrip = Date.now() - start;
          clockOffset = (data.now + roundTrip / 2) - Date.now();
          isSynced = true;
          window.dispatchEvent(new CustomEvent('clock-synced'));
          return;
        }
      }
    } catch (err) {
      // Fallback to HTTP Date header
    }

    try {
      const start = Date.now();
      const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = res.headers.get('Date');
      if (dateHeader) {
        const serverTime = new Date(dateHeader).getTime();
        const roundTrip = Date.now() - start;
        clockOffset = (serverTime + roundTrip / 2) - Date.now();
        isSynced = true;
        window.dispatchEvent(new CustomEvent('clock-synced'));
      }
    } catch (err) {
      console.warn("Time sync fallback to local clock:", err?.message);
    }
  })();

  return syncPromise;
}

/**
 * Returns the current synchronized timestamp in milliseconds.
 */
export function getNow() {
  return Date.now() + clockOffset;
}
