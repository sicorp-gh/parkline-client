// Offline-first cache + outbox, mirroring the same shape the edge unit uses
// for its own local cache / sync queue (admin/api's SyncQueueItem) -- render
// cached data immediately, refresh in the background, and queue actions taken
// while offline instead of losing them.
import { api } from "./api.js";

const CACHE_PREFIX = "parkline_cache_";
const OUTBOX_KEY = "parkline_outbox";

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key, data) {
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, cachedAt: new Date().toISOString() }));
}

// Fetch-with-cache: return cached data immediately (if any) via onCache, then
// try a real fetch and hand the fresh result to onFresh, updating the cache.
// Silent on network failure -- the caller already has the cached render.
export async function loadWithCache(key, fetcher, { onCache, onFresh } = {}) {
  const cached = cacheGet(key);
  if (cached && onCache) onCache(cached.data, cached.cachedAt);
  try {
    const fresh = await fetcher();
    cacheSet(key, fresh);
    if (onFresh) onFresh(fresh);
    return fresh;
  } catch (err) {
    if (!cached) throw err;
    return cached.data;
  }
}

function readOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOutbox(items) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export function queueOutbox(type, payload) {
  const items = readOutbox();
  items.push({ id: crypto.randomUUID(), type, payload, createdAt: new Date().toISOString() });
  writeOutbox(items);
}

export function outboxCount() {
  return readOutbox().length;
}

const HANDLERS = {
  createReservation: (payload) => api.createReservation(payload),
  cancelReservation: (payload) => api.setReservationStatus(payload.id, "cancelled"),
};

// Drains the outbox in order, stopping at the first failure (retried on the
// next flush) so actions never get applied out of order.
export async function flushOutbox() {
  const items = readOutbox();
  const remaining = [...items];
  while (remaining.length) {
    const item = remaining[0];
    const handler = HANDLERS[item.type];
    try {
      if (handler) await handler(item.payload);
      remaining.shift();
    } catch {
      break;
    }
  }
  writeOutbox(remaining);
  return items.length - remaining.length;
}

window.addEventListener("online", () => {
  flushOutbox();
});
if (navigator.onLine) {
  flushOutbox();
}
