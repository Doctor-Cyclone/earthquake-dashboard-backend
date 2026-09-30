type RecordValue = Record<string, unknown>;
function object(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function timestamp(value: unknown): value is number {
  return finite(value) && Math.abs(value) <= 8.64e15;
}

export interface Earthquake {
  id: string;
  magnitude: number | null;
  place: string | null;
  time: string;
  longitude: number;
  latitude: number;
  depthKm: number;
}

export function normalizeFeed(input: unknown) {
  if (!object(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)
    || !object(input.metadata) || !timestamp(input.metadata.generated)) {
    throw new Error('Invalid USGS feed');
  }
  const earthquakes: Earthquake[] = [];
  let skippedCount = 0;
  for (const feature of input.features) {
    if (!object(feature) || feature.type !== 'Feature' || typeof feature.id !== 'string'
      || !object(feature.properties) || !object(feature.geometry)
      || feature.geometry.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) {
      skippedCount++;
      continue;
    }
    const p = feature.properties;
    const [longitude, latitude, depthKm] = feature.geometry.coordinates;
    if (p.type !== 'earthquake' || !timestamp(p.time)
      || !finite(longitude) || Math.abs(longitude) > 180
      || !finite(latitude) || Math.abs(latitude) > 90 || !finite(depthKm)
      || !(p.mag === null || finite(p.mag))
      || !(p.place === null || typeof p.place === 'string')) {
      skippedCount++;
      continue;
    }
    earthquakes.push({
      id: feature.id, magnitude: p.mag, place: p.place,
      time: new Date(p.time).toISOString(), longitude, latitude, depthKm,
    });
  }
  earthquakes.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  return {
    source: 'USGS', period: 'day',
    generatedAt: new Date(input.metadata.generated).toISOString(),
    count: earthquakes.length, skippedCount, earthquakes,
  };
}
