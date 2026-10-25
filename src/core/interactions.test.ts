import { describe, expect, it } from 'vitest';
import { getCardByName } from './cards';
import { findChains, findLinks } from './interactions';
import type { Card } from './types';

const card = (n: string): Card => getCardByName(n)!;
const cards = (...names: string[]) => names.map(card);

describe('findLinks', () => {
  it('links a trasher to a card that rewards being trashed', () => {
    const links = findLinks(cards('Chapel', 'Catacombs'));
    expect(links.map((l) => [l.from.name, l.to.name])).toContainEqual(['Chapel', 'Catacombs']);
  });

  it('respects what a trasher can trash', () => {
    // Moneylender only trashes Coppers; Fortress is an Action.
    expect(findLinks(cards('Moneylender', 'Fortress'))).toEqual([]);
  });

  it('only calls Fortress a loop when the trash pays out', () => {
    const plain = findLinks(cards('Chapel', 'Fortress'))[0]!;
    expect(plain.loop).toBeUndefined();
    const paying = findLinks(cards('Peril', 'Fortress')).find((l) => l.to.name === 'Fortress')!;
    expect(paying.loop).toBe(true);
  });

  it('ignores +Buy next to an Event that sets nothing else off', () => {
    expect(findLinks(cards('Market', 'Peril'))).toEqual([]);
  });

  it('links discarders to discard-triggered cards', () => {
    expect(findLinks(cards('Storeroom', 'Tunnel')).map((l) => l.to.name)).toContain('Tunnel');
  });

  it('caps how many links one card produces', () => {
    const links = findLinks(cards('Peril', 'Fortress', 'Squire', 'Market Square', 'Cutthroat', 'Catacombs', 'Cultist', 'Rats'));
    const fromPeril = links.filter((l) => l.from.name === 'Peril' && !l.first);
    expect(fromPeril.length).toBeLessThanOrEqual(4);
  });

  it('links an Inherited Trait to its pile', () => {
    const links = findLinks(cards('Inherited', 'Smithy'), { traits: [{ trait: card('Inherited'), target: card('Smithy') }] });
    expect(links).toHaveLength(1);
    expect(links[0]!.weight).toBe(1); // Smithy isn't part of any chain
  });
});

describe('findChains', () => {
  it('groups connected links into one chain and leaves unrelated cards out', () => {
    const chains = findChains(cards('Peril', 'Fortress', 'Market Square', 'Smithy'));
    expect(chains).toHaveLength(1);
    expect(chains[0]!.cards).not.toContain(card('Smithy').id);
    expect(chains[0]!.steps!.length).toBeGreaterThanOrEqual(2);
  });

  it('describes a two-card chain in one sentence', () => {
    const [chain] = findChains(cards('Maroon', 'Death Cart'));
    expect(chain!.steps).toBeUndefined();
    expect(chain!.reason).toMatch(/^Death Cart brings Ruins/);
  });

  it('weights longer chains and loops more', () => {
    const [pair] = findChains(cards('Chapel', 'Catacombs'));
    const [loop] = findChains(cards('Peril', 'Fortress', 'Squire'));
    expect(loop!.weight).toBeGreaterThan(pair!.weight * 2);
  });

  it('finds nothing among vanilla cards', () => {
    expect(findChains(cards('Village', 'Smithy', 'Market'))).toEqual([]);
  });
});
