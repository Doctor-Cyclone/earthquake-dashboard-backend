import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';

async function withServer(load: () => Promise<unknown>, check: (url: string) => Promise<void>) {
  const server = createApp(load);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await check(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('serves normalized feed and HEAD without response body', async () => {
  await withServer(async () => ({ type: 'FeatureCollection', metadata: { generated: 0 }, features: [] }), async url => {
    const response = await fetch(`${url}/api/earthquakes`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /application\/json/);
    const body = await response.json();
    assert.equal(body.count, 0);
    assert.equal(body.source, 'USGS');
    assert.ok(Number.isFinite(Date.parse(body.fetchedAt)));
    const head = await fetch(`${url}/api/earthquakes`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  });
});

test('returns 502 on source failures and malformed feeds', async () => {
  for (const load of [async () => { throw new Error('private error detail'); }, async () => ({})]) {
    await withServer(load, async url => {
      const response = await fetch(`${url}/api/earthquakes`);
      assert.equal(response.status, 502);
      assert.equal((await response.json()).code, 'UPSTREAM_UNAVAILABLE');
    });
  }
});

test('health, unknown paths and unsupported methods do not request USGS', async () => {
  let calls = 0;
  await withServer(async () => { calls++; throw new Error('offline'); }, async url => {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    assert.equal((await fetch(`${url}/missing`)).status, 404);
    const response = await fetch(`${url}/api/earthquakes`, { method: 'POST' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.equal(calls, 0);
  });
});
