import { describe, expect, it } from 'vitest';
import { cardsInProducts, getCardByName, productFamily } from './cards';
import { GenerationError, KINGDOM_SIZE, generateKingdom } from './generator';

const name = (n: string) => getCardByName(n)!.id;

describe('generateKingdom', () => {
  it('returns 10 distinct kingdom cards', () => {
    const k = generateKingdom({ seed: 'basic', products: ['base2'] });
    expect(k.cards).toHaveLength(KINGDOM_SIZE);
    expect(new Set(k.cards.map((c) => c.id)).size).toBe(KINGDOM_SIZE);
    expect(k.cards.every((c) => c.kind === 'kingdom')).toBe(true);
  });

  it('is deterministic for a given seed and request', () => {
    const req = { seed: 'same-seed', products: ['base2', 'intrigue2'], landscapes: 0 };
    expect(generateKingdom(req)).toEqual(generateKingdom(req));
  });

  it('varies between seeds', () => {
    const a = generateKingdom({ seed: 'one', products: ['base2', 'intrigue2'] });
    const b = generateKingdom({ seed: 'two', products: ['base2', 'intrigue2'] });
    expect(a.cards.map((c) => c.id)).not.toEqual(b.cards.map((c) => c.id));
  });

  it('generates a seed when none is given', () => {
    const k = generateKingdom({ products: ['base2'] });
    expect(k.seed).toMatch(/^[a-z0-9]{8}$/);
  });

  it('only uses cards from the selected products', () => {
    const k = generateKingdom({ seed: 'owned', products: ['seaside2'] });
    expect(k.cards.every((c) => c.products.includes('seaside2'))).toBe(true);
  });

  it('sorts cards by cost then name', () => {
    const { cards } = generateKingdom({ seed: 'sorted', products: ['base2', 'intrigue2'] });
    const keys = cards.map((c) => [c.cost.coins, c.name] as const);
    const sorted = [...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
    expect(keys).toEqual(sorted);
  });

  it('includes locked cards and excludes banned cards', () => {
    const locked = [name('Chapel'), name('Witch')];
    const banned = [name('Village'), name('Smithy'), name('Moat')];
    for (const seed of ['l1', 'l2', 'l3']) {
      const ids = generateKingdom({ seed, products: ['base2'], locked, banned }).cards.map((c) => c.id);
      expect(ids).toEqual(expect.arrayContaining(locked));
      for (const b of banned) expect(ids).not.toContain(b);
    }
  });

  it('can lock a landscape', () => {
    const k = generateKingdom({ seed: 'land', products: ['base2', 'adventures'], landscapes: 0, locked: [name('Alms')] });
    expect(k.landscapes.map((c) => c.name)).toEqual(['Alms']);
  });

  it('honours the number of landscapes', () => {
    const k = generateKingdom({ seed: 'land2', products: ['base2', 'adventures', 'empires'], landscapes: 2 });
    expect(k.landscapes).toHaveLength(2);
    expect(k.landscapes.every((c) => c.kind === 'landscape')).toBe(true);
  });

  it('picks no landscapes when the player owns none', () => {
    expect(generateKingdom({ seed: 'x', products: ['base2'], landscapes: 2 }).landscapes).toEqual([]);
  });

  it('respects attacks = none', () => {
    for (const seed of ['a1', 'a2', 'a3', 'a4']) {
      const k = generateKingdom({ seed, products: ['base2', 'intrigue2', 'seaside2'], attacks: 'none' });
      expect(k.cards.filter((c) => c.tags.includes('attack'))).toEqual([]);
    }
  });

  it('respects attacks = some (at most two)', () => {
    for (let i = 0; i < 10; i++) {
      const k = generateKingdom({ seed: `s${i}`, products: [], attacks: 'some' });
      expect(k.cards.filter((c) => c.tags.includes('attack')).length).toBeLessThanOrEqual(2);
    }
  });

  it('can exclude complex mechanics', () => {
    for (let i = 0; i < 10; i++) {
      const k = generateKingdom({ seed: `c${i}`, products: [], allowComplex: false, landscapes: 2 });
      expect([...k.cards, ...k.landscapes].filter((c) => c.tags.includes('complex'))).toEqual([]);
    }
  });

  it('limits the number of expansions mixed', () => {
    for (let i = 0; i < 10; i++) {
      const k = generateKingdom({ seed: `m${i}`, products: [], maxProducts: 2 });
      const families = new Set<string>();
      // A card may ship in several products; it's enough that some pair of families covers all cards.
      const options = k.cards.map((c) => new Set(c.products.map(productFamily)));
      for (const o of options) for (const f of o) families.add(f);
      const cover = [...families].some((f1) => [...families].some((f2) => options.every((o) => o.has(f1) || o.has(f2))));
      expect(cover).toBe(true);
    }
  });

  it('adds a Bane when Young Witch is in the kingdom', () => {
    const k = generateKingdom({ seed: 'bane', products: ['base2', 'cornguilds2'], locked: [name('Young Witch')] });
    const bane = k.setup.find((s) => s.title === 'Bane');
    expect(bane?.cardId).toBeDefined();
    expect(k.cards.map((c) => c.id)).not.toContain(bane!.cardId);
  });

  it('adds an Ally when a Liaison is present', () => {
    const liaison = cardsInProducts(['allies']).find((c) => c.types.includes('Liaison') && c.kind === 'kingdom')!;
    const k = generateKingdom({ seed: 'ally', products: ['allies'], locked: [liaison.id] });
    expect(k.extras.map((c) => c.kind)).toEqual(['ally']);
  });

  it('reports a score and synergies', () => {
    const k = generateKingdom({ seed: 'score', products: ['base2'], locked: [name('Village'), name('Smithy')] });
    expect(k.score.total).toBeGreaterThan(0);
    expect(k.synergies.length).toBeGreaterThan(0);
    const ids = new Set(k.cards.map((c) => c.id));
    for (const s of k.synergies) for (const id of s.cards) expect(ids.has(id)).toBe(true);
  });

  it('throws a GenerationError when there are not enough cards', () => {
    const banned = cardsInProducts(['base2'])
      .filter((c) => c.kind === 'kingdom')
      .slice(0, 20)
      .map((c) => c.id);
    expect(() => generateKingdom({ seed: 'x', products: ['base2'], banned })).toThrow(GenerationError);
  });

  it('throws a GenerationError for invalid input', () => {
    expect(() => generateKingdom({ seed: 'x', products: ['nope'] })).toThrow(GenerationError);
    expect(() => generateKingdom({ seed: 'bad seed!' })).toThrow(GenerationError);
  });

  it('prefers better kingdoms than random draws on average', async () => {
    const { scoreKingdom } = await import('./scoring');
    const { findSynergies } = await import('./synergy');
    const { createRng } = await import('./rng');
    const pool = cardsInProducts(['base2', 'intrigue2']).filter((c) => c.kind === 'kingdom');
    let generated = 0;
    let random = 0;
    for (let i = 0; i < 30; i++) {
      generated += generateKingdom({ seed: `q${i}`, products: ['base2', 'intrigue2'], landscapes: 0 }).score.total;
      const cards = createRng(`r${i}`).shuffle(pool).slice(0, 10);
      random += scoreKingdom(cards, [], findSynergies(cards)).total;
    }
    expect(generated / 30).toBeGreaterThan(random / 30 + 5);
  });
});

describe('surprise mode', () => {
  it('uses at least two landscapes and allows complex cards', () => {
    const k = generateKingdom({ seed: 'surprise', products: [], landscapes: 0, allowComplex: false, surprise: true });
    expect(k.landscapes.length).toBeGreaterThanOrEqual(2);
    expect(k.score.parts.map((p) => p.label)).toContain('Unusual mechanics');
  });

  it('places Traits on piles in the setup', () => {
    const inherited = getCardByName('Inherited')!.id;
    const k = generateKingdom({ seed: 'trait', products: ['plunder'], locked: [inherited], landscapes: 1 });
    const note = k.setup.find((n) => n.title === 'Inherited')!;
    expect(k.cards.map((c) => c.id)).toContain(note.targetId);
  });
});
