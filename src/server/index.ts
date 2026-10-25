import { fileURLToPath } from 'node:url';
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';
const staticDir = process.env.STATIC_DIR ?? fileURLToPath(new URL('../web', import.meta.url));

const app = await buildApp({
  staticDir,
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120),
  trustProxy: process.env.TRUST_PROXY === 'true',
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    app.log.info(`${signal} received, shutting down`);
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port, host });
