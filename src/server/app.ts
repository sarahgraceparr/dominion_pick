import { existsSync } from 'node:fs';
import { join } from 'node:path';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { allProducts, database, generateKingdom, generateRequestSchema, GenerationError } from '../core';

export interface AppOptions {
  /** directory with the built web app; omitted in API-only mode / tests */
  staticDir?: string;
  logger?: FastifyServerOptions['logger'];
  /** requests per minute per client IP; 0 disables */
  rateLimitPerMinute?: number;
  /** trust X-Forwarded-* headers (set when running behind a reverse proxy) */
  trustProxy?: boolean;
}

const BODY_LIMIT_BYTES = 16 * 1024;

/**
 * Builds the HTTP server. It is stateless: every response is a pure function
 * of the request, so any number of instances can run behind a load balancer.
 */
export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: options.trustProxy ?? false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  if ((options.rateLimitPerMinute ?? 120) > 0) {
    // Per-instance, in-memory counters: protective only, not application state.
    await app.register(rateLimit, { max: options.rateLimitPerMinute ?? 120, timeWindow: '1 minute' });
  }

  app.setErrorHandler((error: { statusCode?: number; message: string }, request, reply) => {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    if (status === 500) request.log.error(error);
    void reply.status(status).send({ error: status === 500 ? 'Internal Server Error' : error.message });
  });

  app.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/api/')) void reply.header('Cache-Control', 'no-store');
  });

  app.get('/api/v1/health', async () => ({ status: 'ok' }));

  app.get('/api/v1/products', async () => ({
    products: allProducts(),
    source: database.source,
  }));

  app.post('/api/v1/kingdoms', async (request, reply) => {
    const parsed = generateRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    try {
      return generateKingdom(parsed.data);
    } catch (e) {
      if (e instanceof GenerationError) return reply.status(422).send({ error: e.message });
      throw e;
    }
  });

  app.all('/api/*', async (_request, reply) => reply.status(404).send({ error: 'Not Found' }));

  if (options.staticDir && existsSync(join(options.staticDir, 'index.html'))) {
    const assetsDir = join(options.staticDir, 'assets');
    await app.register(fastifyStatic, {
      root: options.staticDir,
      cacheControl: false,
      setHeaders(reply: { header(name: string, value: string): unknown }, path: string) {
        // Vite fingerprints everything under /assets, so it can be cached forever.
        const immutable = path.startsWith(assetsDir);
        reply.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
    // Single-page app: unknown non-API GETs get the app shell.
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
      return reply.status(404).send({ error: 'Not Found' });
    });
  }

  return app;
}
