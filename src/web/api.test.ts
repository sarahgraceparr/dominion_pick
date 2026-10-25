import { describe, expect, it, vi } from 'vitest';
import { ApiError, requestKingdom } from './api';

const req = { seed: 'api-test', products: ['base2'] };

describe('requestKingdom', () => {
  it('posts JSON to the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ seed: 'api-test', cards: [] }), { status: 200 }));
    const result = await requestKingdom(req, fetchMock);
    expect(result.offline).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/kingdoms', expect.objectContaining({ method: 'POST', body: JSON.stringify(req) }));
  });

  it('generates locally on network failure, matching the server output', async () => {
    const result = await requestKingdom(req, vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(result.offline).toBe(true);
    expect(result.kingdom.seed).toBe('api-test');
    expect(result.kingdom.cards).toHaveLength(10);
  });

  it('generates locally on server errors', async () => {
    const result = await requestKingdom(req, vi.fn().mockResolvedValue(new Response('oops', { status: 503 })));
    expect(result.offline).toBe(true);
  });

  it('surfaces client errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 }));
    await expect(requestKingdom(req, fetchMock)).rejects.toEqual(new ApiError('Invalid request', 400));
  });

  it('turns local generation failures into ApiErrors', async () => {
    const banned = [
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
    ];
    await expect(requestKingdom({ ...req, banned }, vi.fn().mockRejectedValue(new TypeError()))).rejects.toBeInstanceOf(ApiError);
  });
});
