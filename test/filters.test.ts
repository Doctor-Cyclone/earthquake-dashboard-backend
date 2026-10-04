import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEarthquakes, parseFilters } from '../src/filters.ts';
import type { Earthquake } from '../src/earthquakes.ts';

const event = (id: string, magnitude: number | null, depthKm: number): Earthquake => ({
  id, magnitude, depthKm, place: null, time: '2026-01-01T00:00:00.000Z', latitude: 0, longitude: 0,
});
const events = [event('unknown', null, 0), event('negative', -1, -2), event('edge', 4.5, 100), event('deep', 5, 200)];

test('filters include boundaries and do not modify the original list', () => {
  const filters = parseFilters(new URLSearchParams('minMagnitude=4.5&maxMagnitude=5&minDepth=0&maxDepth=100'));
  assert.deepEqual(filterEarthquakes(events, filters).map(item => item.id), ['edge']);
  assert.equal(events.length, 4);
  assert.deepEqual(filterEarthquakes(events, {}), events);
  assert.deepEqual(filterEarthquakes(events, { maxDepth: 0 }).map(item => item.id), ['unknown', 'negative']);
  assert.deepEqual(filterEarthquakes(events, { maxMagnitude: 0 }).map(item => item.id), ['negative']);
  assert.deepEqual(filterEarthquakes(events, { minMagnitude: 10 }), []);
});

test('accepts zero and negative values', () => {
  assert.deepEqual(parseFilters(new URLSearchParams('minMagnitude=-1&maxDepth=0')), { minMagnitude: -1, maxDepth: 0 });
});

test('rejects empty, repeated, non-decimal, infinite and unknown parameters', () => {
  for (const query of ['minMagnitude=', 'minMagnitude= ', 'maxDepth=NaN', 'maxDepth=Infinity', 'maxDepth=0x10', 'maxDepth=1e3', 'maxDepth=1&maxDepth=2', 'limit=10', 'minMagnitude=5&maxMagnitude=4', 'minDepth=10&maxDepth=0']) {
    assert.throws(() => parseFilters(new URLSearchParams(query)), Error, query);
  }
});
