import { describe, expect, it } from 'vitest';
import { getCardByName } from '../src/core/cards';
import recommended from './data/recommended-kingdoms.json';
import { analyze, summarize } from './analyze-recommended';
import type { RecommendedKingdom } from './import-recommended';

const kingdoms = recommended as RecommendedKingdom[];

describe('recommended kingdoms benchmark', () => {
  it('resolves every card of every recommended kingdom', () => {
    expect(kingdoms.length).toBeGreaterThanOrEqual(500);
    for (const k of kingdoms) {
      expect(k.cards, k.name).toHaveLength(10);
      for (const n of [...k.cards, ...k.landscapes, ...k.extras]) expect(getCardByName(n), `${k.name}: ${n}`).toBeDefined();
    }
  });

  // The designers picked these kingdoms to be fun. If a model change makes
  // them look no better than random boards from the same sets, it is a regression.
  it('rates the official kingdoms above most random boards from the same sets', () => {
    const { medianPercentile, belowHalf } = summarize(analyze(kingdoms));
    expect(medianPercentile).toBeGreaterThanOrEqual(68);
    expect(belowHalf).toBeLessThan(kingdoms.length * 0.3);
  }, 60_000);
});
