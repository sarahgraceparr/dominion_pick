import { describe, expect, it } from 'vitest';
import { getCardByName } from './cards';
import { EMPHASES, EMPHASIS_RULES, type Emphasis } from './emphasis';
import { generateKingdom } from './generator';
import { scoreKingdom } from './scoring';
import { findSynergies } from './synergy';
import type { Card } from './types';

const cards = (...names: string[]): Card[] => names.map((n) => getCardByName(n)!);
const score = (k: Card[], emphasis: Emphasis[] = []) => scoreKingdom(k, [], findSynergies(k), { emphasis });
const labels = (s: ReturnType<typeof score>) => s.parts.map((p) => p.label);

const ATTACK_BOARD = cards('Witch', 'Militia', 'Bandit', 'Moat', 'Library', 'Fortress', 'Knights', 'Village', 'Cellar', 'Market');

describe('emphasis scoring', () => {
  it('lifts the penalties for attacks and rewards defenses and attack-proof cards', () => {
    const plain = score(ATTACK_BOARD);
    const emphasised = score(ATTACK_BOARD, ['attacks']);
    expect(labels(plain)).toContain('Too many attacks');
    expect(labels(emphasised)).not.toContain('Too many attacks');
    expect(labels(emphasised)).toContain('Emphasis: More attacks');
    expect(emphasised.total).toBeGreaterThan(plain.total + 15);
  });

  it('finds attack-proof interactions', () => {
    const text = findSynergies(cards('Knights', 'Fortress', 'Militia', 'Library'))
      .flatMap((s) => [s.reason, ...(s.steps ?? [])])
      .join(' | ');
    expect(text).toMatch(/Fortress shrugs off Knights: when it is trashed it comes back to your hand/);
    expect(text).toMatch(/Library refills the hand that Militia cuts down/);
  });

  it('rewards Gardens-style boards and drops the Victory pile penalty for fat decks', () => {
    const k = cards('Gardens', 'Silk Road', 'Workshop', 'Ironworks', 'Woodcutter', 'Market', 'Village', 'Smithy', 'Cellar', 'Moat');
    expect(labels(score(k))).toContain('Several Victory piles');
    const fat = score(k, ['fatDeck']);
    expect(labels(fat)).not.toContain('Several Victory piles');
    expect(fat.parts.find((p) => p.label === 'Emphasis: Gainers & fat decks')!.value).toBeGreaterThanOrEqual(15);
  });

  it('penalises engine emphasis without villages', () => {
    const k = cards('Smithy', 'Moat', 'Harbinger', 'Merchant', 'Vassal', 'Militia', 'Poacher', 'Laboratory', 'Market', 'Council Room');
    const engineBoard = cards('Village', 'Smithy', 'Market', 'Moat', 'Harbinger', 'Merchant', 'Vassal', 'Militia', 'Poacher', 'Laboratory');
    const points = (b: Card[]) => score(b, ['engine']).parts.find((p) => p.label === 'Emphasis: Engines & draw')?.value ?? 0;
    expect(points(k)).toBeLessThanOrEqual(0);
    expect(points(engineBoard)).toBeGreaterThan(10);
  });

  it('every emphasis matches some cards', () => {
    const all = generateKingdom({ seed: 'x' }).cards; // warm-up: ensures data loads
    expect(all).toHaveLength(10);
    for (const e of EMPHASES) {
      const matching = ['Witch', 'Outpost', 'Village', 'Smithy', 'Chapel', 'Guardian', 'Gardens', 'Gold Mine', 'Crucible']
        .map((n) => getCardByName(n)!)
        .filter((c) => EMPHASIS_RULES[e].matches(c));
      expect(matching.length, e).toBeGreaterThan(0);
    }
  });
});

describe('emphasis in the generator', () => {
  const average = (emphasis: Emphasis[], measure: (k: ReturnType<typeof generateKingdom>) => number) => {
    let total = 0;
    for (let i = 0; i < 15; i++) total += measure(generateKingdom({ seed: `emph${i}`, products: [], emphasis }));
    return total / 15;
  };

  it.each<[Emphasis, (k: ReturnType<typeof generateKingdom>) => number]>([
    ['attacks', (k) => k.cards.filter((c) => c.tags.includes('attack')).length],
    ['extraTurns', (k) => [...k.cards, ...k.landscapes].filter((c) => c.mechanics.includes('extraTurn')).length],
    ['trashing', (k) => [...k.cards, ...k.landscapes].filter((c) => c.tags.includes('trasher')).length],
    ['fatDeck', (k) => k.cards.filter((c) => EMPHASIS_RULES.fatDeck.matches(c)).length],
  ])('%s shifts kingdoms towards that style', (emphasis, measure) => {
    expect(average([emphasis], measure)).toBeGreaterThan(average([], measure));
  });

  it('keeps kingdoms valid when several styles are combined', () => {
    const k = generateKingdom({ seed: 'combo', products: [], emphasis: [...EMPHASES] });
    expect(new Set(k.cards.map((c) => c.id)).size).toBe(10);
  });
});
