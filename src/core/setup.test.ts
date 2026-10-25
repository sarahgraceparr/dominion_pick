import { describe, expect, it } from 'vitest';
import { cardsInProducts, getCardByName } from './cards';
import { createRng } from './rng';
import { buildSetup, type SetupInput } from './setup';
import type { Card } from './types';

const card = (n: string): Card => getCardByName(n)!;
const kingdom = (n: number) =>
  cardsInProducts(['base2'])
    .filter((c) => c.kind === 'kingdom')
    .slice(0, n);

function input(partial: Partial<SetupInput>): SetupInput {
  return {
    kingdom: [],
    landscapes: [],
    unusedKingdom: cardsInProducts(['base2', 'intrigue2']).filter((c) => c.kind === 'kingdom'),
    allies: cardsInProducts(['allies']).filter((c) => c.kind === 'ally'),
    prophecies: cardsInProducts(['risingsun']).filter((c) => c.kind === 'prophecy'),
    ...partial,
  };
}

describe('buildSetup', () => {
  it('picks a $2-$3 Bane for Young Witch', () => {
    const { notes } = buildSetup(input({ kingdom: [card('Young Witch'), ...kingdom(9)] }), createRng('b'));
    const bane = notes.find((n) => n.title === 'Bane');
    const baneCard = cardsInProducts([]).find((c) => c.id === bane?.cardId)!;
    expect([2, 3]).toContain(baneCard.cost.coins);
  });

  it('asks the user when no Bane candidate exists', () => {
    const { notes } = buildSetup(input({ kingdom: [card('Young Witch')], unusedKingdom: [] }), createRng('b'));
    expect(notes.find((n) => n.title === 'Bane')?.detail).toMatch(/pick one by hand/);
  });

  it('never assigns the same unused card twice', () => {
    const unused = [card('Village'), card('Workshop')];
    const { notes } = buildSetup(input({ kingdom: [card('Young Witch'), card('Ferryman')], unusedKingdom: unused }), createRng('two'));
    const ids = notes.map((n) => n.cardId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('always uses Colony/Platinum for an all-Prosperity kingdom', () => {
    const k = cardsInProducts(['prosperity2'])
      .filter((c) => c.kind === 'kingdom')
      .slice(0, 10);
    const { notes } = buildSetup(input({ kingdom: k }), createRng('p'));
    expect(notes.map((n) => n.title)).toContain('Colony & Platinum');
  });

  it('never uses Colony/Platinum without Prosperity cards', () => {
    const { notes } = buildSetup(input({ kingdom: kingdom(10) }), createRng('p'));
    expect(notes.map((n) => n.title)).not.toContain('Colony & Platinum');
  });

  it('adds Potion for Alchemy potion-cost cards', () => {
    const { notes } = buildSetup(input({ kingdom: [card('Familiar')] }), createRng('x'));
    expect(notes.map((n) => n.title)).toContain('Potion');
  });

  it('adds a Prophecy for Omens', () => {
    const omen = cardsInProducts(['risingsun']).find((c) => c.types.includes('Omen'))!;
    const { extras } = buildSetup(input({ kingdom: [omen] }), createRng('x'));
    expect(extras.map((c) => c.kind)).toEqual(['prophecy']);
  });

  it('skips the Ally when the player owns none', () => {
    const liaison = cardsInProducts(['allies']).find((c) => c.types.includes('Liaison'))!;
    const { extras } = buildSetup(input({ kingdom: [liaison], allies: [] }), createRng('x'));
    expect(extras).toEqual([]);
  });
});
