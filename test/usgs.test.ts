import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchUsgsDay, USGS_DAY_URL } from '../src/usgs.ts';

test('fetches daily feed with a timeout and parses JSON', async () => {
  const result = await fetchUsgsDay(async (url, options) => {
    assert.equal(url, USGS_DAY_URL);
    assert.ok(options?.signal instanceof AbortSignal);
    return Response.json({ type: 'FeatureCollection', features: [] });
  });
  assert.deepEqual(result, { type: 'FeatureCollection', features: [] });
});

test('rejects failed HTTP responses and malformed JSON', async () => {
  await assert.rejects(fetchUsgsDay(async () => new Response('', { status: 503 })), /503/);
  await assert.rejects(fetchUsgsDay(async () => new Response('not JSON')));
});

test('propagates connection failures', async () => {
  await assert.rejects(fetchUsgsDay(async () => { throw new Error('offline'); }), /offline/);
});
