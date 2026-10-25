import { describe, expect, it } from 'vitest';
import { allProducts, cardsInProducts, database, getCard, getCardByName, wikiUrl } from './cards';
import { slug } from './slug';
import { TAGS } from './types';

describe('card database', () => {
  it('has unique ids that match the names', () => {
    const ids = database.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of database.cards) expect(c.id).toBe(slug(c.name));
  });

  it('only uses known tags and products', () => {
    const products = new Set(database.products.map((p) => p.id));
    for (const c of database.cards) {
      for (const t of c.tags) expect(TAGS).toContain(t);
      expect(c.products.length).toBeGreaterThan(0);
      for (const p of c.products) expect(products.has(p)).toBe(true);
    }
  });

  it('does not ship card rules text', () => {
    for (const c of database.cards) expect(Object.keys(c).sort()).toEqual(['cost', 'id', 'kind', 'name', 'products', 'tags', 'types']);
  });

  it('every product has enough kingdom cards for a game on its own or with base', () => {
    for (const p of allProducts()) {
      const n = cardsInProducts([p.id]).filter((c) => c.kind === 'kingdom').length;
      expect(n, p.id).toBeGreaterThan(0);
    }
    expect(cardsInProducts(['base2']).filter((c) => c.kind === 'kingdom').length).toBe(26);
  });

  it.each([
    ['Village', ['village']],
    ['Smithy', ['draw', 'terminal']],
    ['Chapel', ['trasher', 'terminal']],
    ['Witch', ['attack', 'attackCurser', 'draw']],
    ['Militia', ['attack', 'attackHandsize', 'economy']],
    ['Market', ['cantrip', 'economy', 'plusBuy']],
    ['Throne Room', ['throne']],
    ['Moat', ['defense']],
    ['Gardens', ['altVP']],
    ['Bridge', ['costReducer', 'plusBuy']],
    ['Workshop', ['gainer']],
    ['Remodel', ['remodeler', 'trasher']],
    ['Cellar', ['sifter']],
  ])('classifies %s', (name, tags) => {
    expect(getCardByName(name)!.tags).toEqual(expect.arrayContaining(tags));
  });

  it('does not mark Throne Room as terminal', () => {
    expect(getCardByName('Throne Room')!.tags).not.toContain('terminal');
  });

  it('merges cards printed in several editions', () => {
    expect(getCardByName('Village')!.products).toEqual(expect.arrayContaining(['base1', 'base2']));
  });

  it('cardsInProducts with no products returns everything', () => {
    expect(cardsInProducts([])).toHaveLength(database.cards.length);
  });

  it('getCard looks up by id', () => {
    expect(getCard('throne-room')?.name).toBe('Throne Room');
    expect(getCard('nope')).toBeUndefined();
  });

  it('builds wiki links, using the top card of split piles', () => {
    expect(wikiUrl({ name: "King's Court" })).toBe("https://wiki.dominionstrategy.com/index.php/King's_Court");
    expect(wikiUrl({ name: 'Sauna / Avanto' })).toBe('https://wiki.dominionstrategy.com/index.php/Sauna');
  });
});

describe('slug', () => {
  it.each([
    ["King's Court", 'kings-court'],
    ['Sauna / Avanto', 'sauna-avanto'],
    ['Jack of All Trades', 'jack-of-all-trades'],
    ["Philosopher's Stone", 'philosophers-stone'],
  ])('%s -> %s', (name, expected) => expect(slug(name)).toBe(expected));
});
