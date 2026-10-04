import { createServer } from 'node:http';
import { fetchUsgsDay } from './usgs.ts';
import { createFeedCache } from './cache.ts';
import { filterEarthquakes, parseFilters } from './filters.ts';
import type { EarthquakeFilters } from './filters.ts';

export const createApp = (loadFeed: () => Promise<unknown> = fetchUsgsDay) => {
  const getFeed = createFeedCache(loadFeed);

  return createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');

    const requestUrl = request.url ?? '';
    const queryIndex = requestUrl.indexOf('?');
    const path = queryIndex < 0 ? requestUrl : requestUrl.slice(0, queryIndex);
    const query = queryIndex < 0 ? '' : requestUrl.slice(queryIndex + 1);
    const send = (status: number, body: unknown) => {
      response.writeHead(status);
      response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
    };

    if (path !== '/health' && path !== '/api/earthquakes') {
      send(404, { error: 'Not found' });

      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, { error: 'Method not allowed' });

      return;
    }

    if (path === '/health') {
      send(200, { status: 'ok', service: 'earthquake-dashboard-backend' });

      return;
    }

    let filters: EarthquakeFilters;

    try {
      filters = parseFilters(new URLSearchParams(query));
    } catch (error) {
      send(400, {
        error: error instanceof Error ? error.message : 'Invalid query parameters',
        code: 'INVALID_QUERY',
      });

      return;
    }

    try {
      const result = await getFeed();
      const earthquakes = filterEarthquakes(result.earthquakes, filters);

      send(200, { ...result, count: earthquakes.length, earthquakes });
    } catch {
      send(502, {
        error: 'Earthquake data is temporarily unavailable',
        code: 'UPSTREAM_UNAVAILABLE',
      });
    }
  });
};
