import { describe, expect, it } from 'vitest';
import { generateRequestSchema } from './schema';

describe('generateRequestSchema', () => {
  it('fills in defaults', () => {
    expect(generateRequestSchema.parse({})).toEqual({
      products: [],
      landscapes: 1,
      attacks: 'any',
      allowComplex: true,
      maxProducts: 0,
      surprise: false,
      locked: [],
      banned: [],
    });
  });

  it.each([
    [{ extra: 1 }, 'unknown fields'],
    [{ seed: '<script>' }, 'unsafe seed'],
    [{ seed: 'x'.repeat(33) }, 'long seed'],
    [{ products: ['nope'] }, 'unknown product'],
    [{ locked: ['not-a-card'] }, 'unknown card'],
    [{ locked: ['../etc/passwd'] }, 'malformed card id'],
    [{ landscapes: 9 }, 'too many landscapes'],
    [{ landscapes: 1.5 }, 'non-integer'],
    [{ attacks: 'lots' }, 'bad enum'],
    [{ banned: Array(301).fill('village') }, 'oversized list'],
  ])('rejects %j (%s)', (input, _reason) => {
    expect(generateRequestSchema.safeParse(input).success).toBe(false);
  });
});
