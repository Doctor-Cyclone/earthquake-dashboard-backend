export const USGS_DAY_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

export const fetchUsgsDay = async (fetcher: typeof fetch = fetch): Promise<unknown> => {
  const response = await fetcher(USGS_DAY_URL, {
    headers: { Accept: 'application/geo+json, application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);

  return response.json();
};
