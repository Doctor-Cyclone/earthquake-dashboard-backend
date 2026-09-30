import { createServer } from 'node:http';
import { fetchUsgsDay } from './usgs.ts';
import { normalizeFeed } from './earthquakes.ts';

export function createApp(loadFeed: () => Promise<unknown> = fetchUsgsDay) {
  return createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    const path = request.url?.split('?')[0];
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
    try {
      const result = normalizeFeed(await loadFeed());
      send(200, { ...result, fetchedAt: new Date().toISOString() });
    } catch {
      send(502, { error: 'Earthquake data is temporarily unavailable', code: 'UPSTREAM_UNAVAILABLE' });
    }
  });
}
