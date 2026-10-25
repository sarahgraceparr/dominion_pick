/**
 * "Golden" examples of fun kingdoms from real play. Each one must be
 * recognised as a chain with the right explanation, and boards built around
 * them must outscore the same boards without the combo. Add new examples
 * here when the model misses something.
 */
import { describe, expect, it } from 'vitest';
import { cardsInProducts, database, getCardByName } from './cards';
import { createRng } from './rng';
import { scoreKingdom } from './scoring';
import { findSynergies } from './synergy';
import type { Card, Synergy } from './types';
import type { InteractionContext } from './interactions';

const card = (n: string): Card => {
  const c = getCardByName(n);
  if (!c) throw new Error(`unknown card ${n}`);
  return c;
};
const SHELTERS = database.cards.filter((c) => c.kind === 'shelter');
const chainWith = (synergies: Synergy[], ...names: string[]) =>
  synergies.find((s) => s.kind === 'chain' && names.every((n) => s.cards.includes(card(n).id)));
const allText = (s: Synergy | undefined) => [s?.reason ?? '', ...(s?.steps ?? [])].join(' | ');

/** Vanilla filler so the examples are scored on a realistic 10-card board. */
const FILLER = ['Village', 'Smithy', 'Market', 'Militia', 'Cellar', 'Laboratory', 'Moat', 'Harbinger', 'Merchant', 'Festival'].map(card);

function board(combo: Card[], landscapes: Card[] = []) {
  const kingdom = [...combo.filter((c) => c.kind === 'kingdom'), ...FILLER].slice(0, 10);
  return { kingdom, landscapes: [...landscapes, ...combo.filter((c) => c.kind === 'landscape')] };
}

describe('fun examples', () => {
  it('Peril + Fortress + Market Square + Squire + Cutthroat: a looping chain through an Event', () => {
    const s = chainWith(
      findSynergies(['Peril', 'Fortress', 'Market Square', 'Squire', 'Cutthroat'].map(card)),
      'Peril',
      'Fortress',
      'Market Square',
      'Squire',
      'Cutthroat',
    );
    expect(s?.loop).toBe(true);
    const text = allText(s);
    expect(text).toMatch(/Squire's \+Buys let you use Peril more than once a turn/);
    expect(text).toMatch(/Fortress comes straight back to your hand/);
    expect(text).toMatch(/Peril trashes also triggers Market Square/);
    expect(text).toMatch(/Cutthroat gains you another Loot/);
    expect(text).toMatch(/Trashing Squire gains you a Cutthroat/);
    // Play order: the +Buys come first.
    expect(s!.steps![0]).toMatch(/^Squire's \+Buys/);
  });

  it('Maroon + Death Cart: Ruins have two types', () => {
    const s = chainWith(findSynergies([card('Maroon'), card('Death Cart')]), 'Maroon', 'Death Cart');
    expect(s?.reason).toMatch(/Action–Ruins: Maroon trashes each one for \+4 Cards/);
  });

  it('Shaman makes the trash a shared resource', () => {
    const s = chainWith(findSynergies([card('Shaman'), card('Chapel')]), 'Shaman', 'Chapel');
    expect(s?.reason).toMatch(/up for grabs/);
    const { kingdom } = board([card('Shaman'), card('Chapel')]);
    expect(scoreKingdom(kingdom, [], findSynergies(kingdom)).parts.map((p) => p.label)).toContain('Player interaction');
  });

  it('Rogue gets goodies out of the trash other cards fill', () => {
    const s = chainWith(findSynergies([card('Rogue'), card('Remodel')]), 'Rogue', 'Remodel');
    expect(s?.reason).toMatch(/Rogue lets players take it back out of the trash/);
  });

  it('Rats + Crucible + Inherited on Rats: a self-feeding loop from turn one', () => {
    const ctx: InteractionContext = { traits: [{ trait: card('Inherited'), target: card('Rats') }] };
    const s = chainWith(findSynergies([card('Rats'), card('Crucible'), card('Inherited')], ctx), 'Rats', 'Crucible', 'Inherited');
    expect(s?.loop).toBe(true);
    const text = allText(s);
    expect(text).toMatch(/you start the game with a Rats/);
    expect(text).toMatch(/Crucible trashes the copies for their full \$4/);
    expect(s!.steps![0]).toMatch(/^Inherited/);
  });

  it('Peril + Shelters: Necropolis becomes a Loot on the first shuffle', () => {
    const withShelters = findSynergies([card('Peril'), ...SHELTERS]);
    expect(allText(chainWith(withShelters, 'Peril', 'Necropolis'))).toMatch(/starting Necropolis into a \$7 Loot/);
    expect(chainWith(findSynergies([card('Peril')]), 'Peril', 'Necropolis')).toBeUndefined();
  });

  // From the official recommended kingdoms (scripts/data/recommended-kingdoms.json).
  it('Stargazing: revealing cards pays Patron', () => {
    const s = chainWith(findSynergies([card('Sage'), card('Patron')]), 'Sage', 'Patron');
    expect(s?.reason).toMatch(/Sage reveals cards, and each Patron it reveals pays out Coffers/);
  });

  it('Repetition: Treasury comes back for the Outpost turn', () => {
    const s = chainWith(findSynergies([card('Treasury'), card('Outpost')]), 'Treasury', 'Outpost');
    expect(allText(s)).toMatch(/Treasury puts itself back on top of your deck, so Outpost's extra turn draws it again/);
  });

  it('Prophecy: Ironmonger pays twice for Action–Victory cards, Rebuild climbs Victory cards', () => {
    const text = allText(chainWith(findSynergies(['Ironmonger', 'Great Hall', 'Rebuild'].map(card)), 'Ironmonger', 'Great Hall'));
    expect(text).toMatch(/Ironmonger pays out for each of Great Hall's types \(Action–Victory\)/);
    expect(text).toMatch(/Rebuild climbs the Victory ladder/);
  });

  it('Quarrymen: Coffers fund overpaying, cost reduction reaches the expensive cards', () => {
    const text = findSynergies(['Baker', 'Stonemason', 'Quarry', 'Expand'].map(card)).map(allText).join(' | ');
    expect(text).toMatch(/Coffers from Baker let you overpay big for Stonemason/);
    expect(text).toMatch(/Quarry brings Expand within reach/);
  });

  it.each([
    ['Peril combo', ['Peril', 'Fortress', 'Market Square', 'Squire', 'Cutthroat']],
    ['Rats + Crucible', ['Rats', 'Crucible']],
    ['Maroon + Death Cart', ['Maroon', 'Death Cart']],
  ])('%s outscores the same board without the combo', (_name, names) => {
    const combo = board(names.map(card));
    const plain = board([]);
    const score = (b: ReturnType<typeof board>) =>
      scoreKingdom(b.kingdom, b.landscapes, findSynergies([...b.kingdom, ...b.landscapes])).total;
    expect(score(combo)).toBeGreaterThan(score(plain));
  });

  it('the Peril combo board is in the top 10% of random boards from the same sets', () => {
    const pool = cardsInProducts(['darkages', 'plunder']).filter((c) => c.kind === 'kingdom');
    const events = cardsInProducts(['plunder']).filter((c) => c.types.includes('Event'));
    const rng = createRng('golden');
    const randomScores = Array.from({ length: 200 }, () => {
      const kingdom = rng.shuffle(pool).slice(0, 10);
      const landscapes = [rng.pick(events)];
      return scoreKingdom(kingdom, landscapes, findSynergies([...kingdom, ...landscapes])).total;
    }).sort((a, b) => a - b);
    const kingdom = [
      ...['Fortress', 'Market Square', 'Squire', 'Cutthroat'].map(card),
      ...rng.shuffle(pool.filter((c) => !['Fortress', 'Market Square', 'Squire', 'Cutthroat'].includes(c.name))).slice(0, 6),
    ];
    const landscapes = [card('Peril')];
    const score = scoreKingdom(kingdom, landscapes, findSynergies([...kingdom, ...landscapes])).total;
    expect(score).toBeGreaterThanOrEqual(randomScores[Math.floor(randomScores.length * 0.9)]!);
  });
});
