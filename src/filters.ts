import type { Earthquake } from './earthquakes.ts';

const FILTER_NAMES = ['minMagnitude', 'maxMagnitude', 'minDepth', 'maxDepth'] as const;

type FilterName = (typeof FILTER_NAMES)[number];

export type EarthquakeFilters = Partial<Record<FilterName, number>>;

export const parseFilters = (parameters: URLSearchParams): EarthquakeFilters => {
  const filters: EarthquakeFilters = {};

  for (const name of parameters.keys()) {
    if (!FILTER_NAMES.includes(name as FilterName)) {
      throw new Error(`Unknown query parameter: ${name}`);
    }
  }

  for (const name of FILTER_NAMES) {
    const values = parameters.getAll(name);

    if (values.length === 0) continue;

    if (
      values.length !== 1 ||
      !/^-?\d+(?:\.\d+)?$/.test(values[0]!) ||
      !Number.isFinite(Number(values[0]))
    ) {
      throw new Error(`${name} must be a single finite decimal number`);
    }

    filters[name] = Number(values[0]);
  }

  if (
    filters.minMagnitude !== undefined &&
    filters.maxMagnitude !== undefined &&
    filters.minMagnitude > filters.maxMagnitude
  ) {
    throw new Error('minMagnitude must not exceed maxMagnitude');
  }

  if (
    filters.minDepth !== undefined &&
    filters.maxDepth !== undefined &&
    filters.minDepth > filters.maxDepth
  ) {
    throw new Error('minDepth must not exceed maxDepth');
  }

  return filters;
};

export const filterEarthquakes = (
  earthquakes: Earthquake[],
  filters: EarthquakeFilters,
) => {
  return earthquakes.filter(({ magnitude, depthKm }) => {
    if (
      filters.minMagnitude !== undefined &&
      (magnitude === null || magnitude < filters.minMagnitude)
    )
      return false;

    if (
      filters.maxMagnitude !== undefined &&
      (magnitude === null || magnitude > filters.maxMagnitude)
    )
      return false;

    if (filters.minDepth !== undefined && depthKm < filters.minDepth) return false;

    if (filters.maxDepth !== undefined && depthKm > filters.maxDepth) return false;

    return true;
  });
};
