import { createApp } from './app.ts';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? '3000');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = createApp();

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
