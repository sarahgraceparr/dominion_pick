import { describe, expect, it } from 'vitest';
import { getCardByName } from './cards';
import { COMBOS } from './combos';
import { findSynergies } from './synergy';
import type { Card } from './types';

const cards = (...names: string[]): Card[] =>
  names.map((n) => {
    const c = getCardByName(n);
    if (!c) throw new Error(`unknown card ${n}`);
    return c;
  });

describe('COMBOS', () => {
  it('only references real cards', () => {
    for (const combo of COMBOS) {
      for (const n of [combo.card, ...combo.partners]) expect(getCardByName(n), n).toBeDefined();
    }
  });
});

describe('findSynergies', () => {
  it('finds a curated combo', () => {
    const s = findSynergies(cards('Workshop', 'Gardens', 'Village'));
    expect(s.some((x) => x.reason.startsWith('Gardens + Workshop'))).toBe(true);
  });

  it('lists every present partner of a combo once', () => {
    const s = findSynergies(cards('Gardens', 'Workshop', 'Ironworks'));
    const gardens = s.filter((x) => x.reason.startsWith('Gardens +'));
    expect(gardens).toHaveLength(1);
    expect(gardens[0]!.cards).toHaveLength(3);
  });

  it('finds village + terminal draw', () => {
    const s = findSynergies(cards('Village', 'Smithy'));
    expect(s.map((x) => x.reason)).toContain('Village gives the Actions to chain several Smithy');
  });

  it('finds Throne Room with a strong terminal but not a weak one', () => {
    expect(findSynergies(cards('Throne Room', 'Witch')).some((x) => x.reason.includes('doubles up'))).toBe(true);
    expect(findSynergies(cards('Throne Room', 'Chapel')).some((x) => x.reason.includes('doubles up'))).toBe(false);
  });

  it('finds counterplay to attacks', () => {
    const reasons = findSynergies(cards('Moat', 'Witch', 'Chapel')).map((x) => x.reason);
    expect(reasons).toContain('Moat gives a way to fight back against Witch');
    expect(reasons).toContain('Chapel can clean out the junk Witch hands out');
  });

  it('finds +Buy with cost reduction', () => {
    const s = findSynergies(cards('Bridge', 'Market'));
    expect(s.some((x) => x.reason.includes('makes cards cheaper'))).toBe(true);
  });

  it('caps how often one card participates in generic synergies', () => {
    const s = findSynergies(cards('Village', 'Smithy', 'Moat', 'Library', 'Council Room', 'Witch'));
    const village = s.filter((x) => x.cards.includes(getCardByName('Village')!.id));
    expect(village.length).toBeLessThanOrEqual(2);
  });

  it('returns nothing for unrelated cards', () => {
    expect(findSynergies(cards('Harbinger', 'Merchant'))).toEqual([]);
  });
});
