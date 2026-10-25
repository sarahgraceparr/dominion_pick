import { describe, expect, it } from 'vitest';
import { getCardByName } from './cards';
import { scoreKingdom, viableStrategies } from './scoring';
import { findSynergies } from './synergy';
import type { Card } from './types';

const cards = (...names: string[]): Card[] => names.map((n) => getCardByName(n)!);
const score = (...names: string[]) => {
  const k = cards(...names);
  return scoreKingdom(k, [], findSynergies(k));
};
const labels = (s: ReturnType<typeof score>) => s.parts.map((p) => p.label);

// First Game (2nd edition recommended kingdom) — a known-good board.
const FIRST_GAME = ['Cellar', 'Market', 'Merchant', 'Militia', 'Mine', 'Moat', 'Remodel', 'Smithy', 'Village', 'Workshop'];

describe('scoreKingdom', () => {
  it('total is the sum of the parts', () => {
    const s = score(...FIRST_GAME);
    expect(s.total).toBe(Math.round(s.parts.reduce((t, p) => t + p.value, 0)));
  });

  it('recognises an engine', () => {
    const s = score(...FIRST_GAME);
    expect(s.archetypes).toContain('Engine');
    expect(s.archetypes).toContain('Big Money');
    expect(labels(s)).toContain('2 viable strategies');
  });

  it('penalises stacked cursers', () => {
    const s = score('Witch', 'Mountebank', 'Sea Hag', 'Village', 'Smithy', 'Market', 'Cellar', 'Harbinger', 'Merchant', 'Festival');
    expect(labels(s)).toContain('Stacked cursers');
  });

  it('penalises a lone curser with no counterplay', () => {
    const s = score('Witch', 'Village', 'Smithy', 'Market', 'Cellar', 'Harbinger', 'Merchant', 'Festival', 'Laboratory', 'Library');
    expect(labels(s)).toContain('Curses with no way to clean up');
  });

  it('flags a Big Money board', () => {
    const s = score('Smithy', 'Moat', 'Harbinger', 'Merchant', 'Vassal', 'Militia', 'Poacher', 'Laboratory', 'Market', 'Council Room');
    expect(s.archetypes).toContain('Big Money');
  });

  it('rates the First Game board above a Big Money board', () => {
    const bigMoney = score(
      'Smithy',
      'Moat',
      'Harbinger',
      'Merchant',
      'Vassal',
      'Militia',
      'Poacher',
      'Laboratory',
      'Market',
      'Council Room',
    );
    expect(score(...FIRST_GAME).total).toBeGreaterThan(bigMoney.total);
  });

  it('penalises boards without cheap or expensive cards', () => {
    const allFours = score(
      'Smithy',
      'Militia',
      'Gardens',
      'Throne Room',
      'Remodel',
      'Moneylender',
      'Poacher',
      'Bureaucrat',
      'Bridge',
      'Ironworks',
    );
    expect(labels(allFours)).toEqual(expect.arrayContaining(['No cheap openers', 'No expensive cards']));
  });
});

describe('viableStrategies', () => {
  it('finds several strategies on a rich board', () => {
    const k = cards('Chapel', 'Village', 'Smithy', 'Market', 'Gardens', 'Workshop', 'Gold Mine', 'Witch', 'Festival', 'Laboratory');
    const strategies = viableStrategies(k, [], findSynergies(k));
    expect(strategies).toEqual(expect.arrayContaining(['Big Money', 'Engine', 'Alt-VP']));
  });

  it('recognises a combo from a looping chain', () => {
    const k = cards('Fortress', 'Squire', 'Market Square', 'Village', 'Smithy');
    const l = cards('Peril');
    expect(viableStrategies(k, l, findSynergies([...k, ...l]))).toContain('Combo');
  });

  it('gives more points for more viable strategies', () => {
    const one = score('Smithy', 'Moat', 'Harbinger', 'Merchant', 'Vassal', 'Militia', 'Poacher', 'Laboratory', 'Market', 'Council Room');
    const many = score('Chapel', 'Village', 'Smithy', 'Market', 'Gardens', 'Workshop', 'Gold Mine', 'Witch', 'Festival', 'Laboratory');
    const pts = (s: ReturnType<typeof score>) => s.parts.find((p) => /viable strateg/.test(p.label))?.value ?? 0;
    expect(pts(many)).toBeGreaterThan(pts(one));
  });
});

describe('surprise scoring', () => {
  it('rewards chains through landscapes and unusual card types', () => {
    const k = cards('Fortress', 'Squire', 'Market Square', 'Cutthroat', 'Village', 'Smithy', 'Cellar', 'Moat', 'Harbinger', 'Merchant');
    const l = cards('Peril');
    const syn = findSynergies([...k, ...l]);
    const normal = scoreKingdom(k, l, syn);
    const surprise = scoreKingdom(k, l, syn, { surprise: true });
    expect(surprise.total).toBeGreaterThan(normal.total);
    expect(surprise.parts.map((p) => p.label)).toContain('Unusual mechanics');
  });
});
