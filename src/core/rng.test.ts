import { describe, expect, it } from 'vitest';
import { createRng, randomSeed } from './rng';

describe('createRng', () => {
  it('is deterministic per seed', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('differs between seeds', () => {
    expect(createRng('a').next()).not.toBe(createRng('b').next());
  });

  it('produces floats in [0, 1) and ints in range', () => {
    const rng = createRng('range');
    for (let i = 0; i < 1000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(7);
      expect(Number.isInteger(n) && n >= 0 && n < 7).toBe(true);
    }
  });

  it('is roughly uniform', () => {
    const rng = createRng('uniform');
    const buckets = new Array(4).fill(0);
    for (let i = 0; i < 4000; i++) buckets[rng.int(4)]++;
    for (const b of buckets) expect(b).toBeGreaterThan(850);
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = createRng('shuffle').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });

  it('pick throws on an empty list', () => {
    expect(() => createRng('x').pick([])).toThrow();
  });
});

describe('randomSeed', () => {
  it('creates distinct url-safe seeds', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => randomSeed()));
    expect(seeds.size).toBe(50);
    for (const s of seeds) expect(s).toMatch(/^[a-z2-9]{8}$/);
  });
});
