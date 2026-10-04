import { normalizeFeed } from './earthquakes.ts';
import { fetchUsgsDay } from './usgs.ts';

const CACHE_TTL_MS = 60_000;
type Snapshot = ReturnType<typeof normalizeFeed> & { fetchedAt: string };

export const createFeedCache = (
  loadFeed: () => Promise<unknown> = fetchUsgsDay,
  now: () => number = Date.now,
) => {
  let snapshot: Snapshot | null = null;
  let expiresAt = 0;
  let retryAt = 0;
  let pending: Promise<Snapshot> | null = null;

  const getFeed = async () => {
    if (snapshot && now() < expiresAt) {
      return { ...snapshot, stale: false };
    }

    if (snapshot && now() < retryAt) {
      return { ...snapshot, stale: true };
    }

    if (!pending) {
      pending = (async () => {
        const normalized = normalizeFeed(await loadFeed());
        const fetchedAt = now();

        snapshot = { ...normalized, fetchedAt: new Date(fetchedAt).toISOString() };
        expiresAt = fetchedAt + CACHE_TTL_MS;
        retryAt = 0;

        return snapshot;
      })();
    }

    try {
      return { ...(await pending), stale: false };
    } catch (error) {
      if (!snapshot) throw error;

      retryAt = now() + CACHE_TTL_MS;

      return { ...snapshot, stale: true };
    } finally {
      pending = null;
    }
  };

  return getFeed;
};
