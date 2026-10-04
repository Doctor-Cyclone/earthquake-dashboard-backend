import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedCache } from '../src/cache.ts';

const feed = { type: 'FeatureCollection', metadata: { generated: 0 }, features: [] };

test('cache expires at 60 seconds and preserves original fetch time', async () => {
  let time = 0;
  let calls = 0;
  const getFeed = createFeedCache(async () => { calls++; return feed; }, () => time);
  const first = await getFeed();

  time = 59_999;
  assert.deepEqual(await getFeed(), first);
  assert.equal(calls, 1);

  time = 60_000;
  const next = await getFeed();
  assert.equal(calls, 2);
  assert.notEqual(next.fetchedAt, first.fetchedAt);
});

test('concurrent requests share one upstream call', async () => {
  let calls = 0;
  let resolve!: (value: unknown) => void;
  const getFeed = createFeedCache(() => { calls++; return new Promise(done => { resolve = done; }); });
  const first = getFeed();
  const second = getFeed();

  resolve(feed);
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
});

test('failed refresh serves stale data, delays retries and recovers', async () => {
  let time = 0;
  let fail = false;
  let calls = 0;
  const getFeed = createFeedCache(async () => {
    calls++;
    if (fail) throw new Error('offline');
    return feed;
  }, () => time);
  const first = await getFeed();

  time = 60_000;
  fail = true;
  const stale = await getFeed();
  assert.equal(stale.stale, true);
  assert.equal(stale.fetchedAt, first.fetchedAt);
  await getFeed();
  assert.equal(calls, 2);

  time = 120_000;
  fail = false;
  assert.equal((await getFeed()).stale, false);
  assert.equal(calls, 3);
});

test('cold failures reject and malformed refresh cannot replace good cache', async () => {
  let value: unknown = {};
  let time = 0;
  const getFeed = createFeedCache(async () => value, () => time);
  await assert.rejects(getFeed(), /Invalid USGS/);

  value = feed;
  const first = await getFeed();
  value = {};
  time = 60_000;
  assert.deepEqual(await getFeed(), { ...first, stale: true });
});
