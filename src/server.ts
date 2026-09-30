import { createServer } from 'node:http';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? '3000');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const path = request.url?.split('?')[0];

  if (path !== '/health') {
    response.writeHead(404);
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  response.writeHead(200);
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify({
    status: 'ok',
    service: 'earthquake-dashboard-backend',
  }));
});

server.on('error', (error) => {
  console.error('Server failed:', error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close((error) => {
      if (error) console.error(error.message);
      process.exitCode = error ? 1 : 0;
    });
    setTimeout(() => server.closeAllConnections(), 5000).unref();
  });
}
