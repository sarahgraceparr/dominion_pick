import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app';

describe('API', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await buildApp({ rateLimitPerMinute: 0 });
  });
  afterAll(() => app.close());

  it('GET /api/v1/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /api/v1/products lists products in order', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/products' });
    const body = res.json();
    expect(body.products.length).toBeGreaterThan(10);
    expect(body.products[0]).toMatchObject({ id: 'base1', name: 'Dominion' });
    expect(body.source.revision).toMatch(/^[0-9a-f]{40}$/);
  });

  it('POST /api/v1/kingdoms generates a kingdom', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/kingdoms', payload: { seed: 'api', products: ['base2'] } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.seed).toBe('api');
    expect(body.cards).toHaveLength(10);
  });

  it('is stateless: the same request gives the same answer', async () => {
    const payload = { seed: 'repeat', products: ['base2', 'intrigue2'] };
    const a = await app.inject({ method: 'POST', url: '/api/v1/kingdoms', payload });
    const b = await app.inject({ method: 'POST', url: '/api/v1/kingdoms', payload });
    expect(a.json()).toEqual(b.json());
  });

  it('accepts an empty body', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/kingdoms' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects invalid input with 400 and details', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/kingdoms', payload: { products: ['nope'], hack: true } });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues.length).toBeGreaterThan(0);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/kingdoms',
      headers: { 'content-type': 'application/json' },
      payload: '{"seed":',
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects oversized bodies with 413', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/kingdoms',
      payload: { seed: 'x', padding: 'x'.repeat(20_000) },
    });
    expect(res.statusCode).toBe(413);
  });

  it('returns 422 when the settings leave too few cards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/kingdoms',
      payload: {
        products: ['base2'],
        banned: [
          'village',
          'smithy',
          'chapel',
          'cellar',
          'moat',
          'market',
          'militia',
          'mine',
          'witch',
          'library',
          'gardens',
          'remodel',
          'workshop',
          'festival',
          'laboratory',
          'bureaucrat',
          'throne-room',
        ],
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/Not enough cards/);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not Found' });
  });

  it('sets security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('limits requests per client', async () => {
    const app = await buildApp({ rateLimitPerMinute: 2 });
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode);
    expect(codes).toEqual([200, 200, 429]);
    await app.close();
  });
});

describe('static web app', () => {
  let dir: string;
  let app: FastifyInstance;
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'dominion-pick-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>shell</title>');
    writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
    app = await buildApp({ staticDir: dir, rateLimitPerMinute: 0 });
  });
  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('serves the app shell for client-side routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/some/deep/link' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('shell');
  });

  it('caches fingerprinted assets forever and the shell never', async () => {
    const asset = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(asset.headers['cache-control']).toContain('immutable');
    const shell = await app.inject({ method: 'GET', url: '/' });
    expect(shell.headers['cache-control']).toBe('no-cache');
  });

  it('does not serve files outside the static root', async () => {
    const res = await app.inject({ method: 'GET', url: '/../package.json' });
    expect(res.body).not.toContain('"dependencies"');
  });

  it('still answers API 404s with JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/missing' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not Found' });
  });
});
