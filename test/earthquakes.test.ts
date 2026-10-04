import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFeed } from '../src/earthquakes.ts';

const event = (id: string, time: number, mag: number | null = 2) => ({
  type: 'Feature',
  id,
  properties: { type: 'earthquake', mag, place: null, time },
  geometry: { type: 'Point', coordinates: [35, 41, -1] },
});
const feed = (features: unknown[]) => ({
  type: 'FeatureCollection',
  metadata: { generated: 1000 },
  features,
});

test('preserves coordinate order, null magnitude and negative depth; sorts newest first', () => {
  const result = normalizeFeed(feed([event('old', 0), event('new', 1000, null)]));

  assert.equal(result.generatedAt, '1970-01-01T00:00:01.000Z');
  assert.deepEqual(result.earthquakes[0], {
    id: 'new',
    magnitude: null,
    place: null,
    time: '1970-01-01T00:00:01.000Z',
    longitude: 35,
    latitude: 41,
    depthKm: -1,
  });
  assert.equal(result.count, 2);
});

test('skips malformed records and non-earthquake events without losing valid events', () => {
  const explosion = event('explosion', 0);

  explosion.properties.type = 'explosion';

  const badCoordinates = event('bad', 0);

  badCoordinates.geometry.coordinates = [0, 91, 1];

  const result = normalizeFeed(
    feed([null, explosion, badCoordinates, event('valid', 0)]),
  );

  assert.equal(result.count, 1);
  assert.equal(result.skippedCount, 3);
});

test('rejects invalid feed envelopes and accepts empty feeds', () => {
  for (const bad of [null, {}, { type: 'FeatureCollection', features: [] }]) {
    assert.throws(() => normalizeFeed(bad), /Invalid USGS/);
  }

  assert.equal(normalizeFeed(feed([])).count, 0);
});
