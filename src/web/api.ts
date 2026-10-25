import { generateKingdom, GenerationError, type GenerateRequestInput, type Kingdom } from '../core';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface KingdomResult {
  kingdom: Kingdom;
  /** true when the server was unreachable and the kingdom was generated on the device */
  offline: boolean;
}

/**
 * Asks the API for a kingdom. If the device is offline or the server can't be
 * reached, the very same generator runs locally (it is pure and seeded, so the
 * result is identical to what the server would have returned).
 */
export async function requestKingdom(request: GenerateRequestInput, fetchImpl: typeof fetch = fetch): Promise<KingdomResult> {
  let response: Response;
  try {
    response = await fetchImpl('/api/v1/kingdoms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    return { kingdom: generateLocally(request), offline: true };
  }
  if (response.status >= 500) return { kingdom: generateLocally(request), offline: true };
  const body = (await response.json().catch(() => ({}))) as Kingdom & { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status);
  return { kingdom: body, offline: false };
}

function generateLocally(request: GenerateRequestInput): Kingdom {
  try {
    return generateKingdom(request);
  } catch (e) {
    if (e instanceof GenerationError) throw new ApiError(e.message, 422);
    throw e;
  }
}
