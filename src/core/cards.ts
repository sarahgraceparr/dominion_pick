import data from './data/cards.json';
import type { Card, CardDatabase, Product, Tag } from './types';

export const database = data as CardDatabase;

const byId = new Map(database.cards.map((c) => [c.id, c]));
const byName = new Map(database.cards.map((c) => [c.name, c]));

export function getCard(id: string): Card | undefined {
  return byId.get(id);
}

export function getCardByName(name: string): Card | undefined {
  return byName.get(name);
}

export function allProducts(): Product[] {
  return [...database.products].sort((a, b) => a.order - b.order);
}

export function hasTag(card: Card, tag: Tag): boolean {
  return card.tags.includes(tag);
}

/** Cards available when the player owns the given products (empty = all). */
export function cardsInProducts(products: readonly string[]): Card[] {
  if (products.length === 0) return database.cards;
  const owned = new Set(products);
  return database.cards.filter((c) => c.products.some((p) => owned.has(p)));
}

/** Product "family" (e.g. both Dominion editions -> "Dominion") used for set-mixing limits. */
export function productFamily(productId: string): string {
  return database.products.find((p) => p.id === productId)?.name ?? productId;
}

/** Link to the community wiki page for a card (the app never shows card text itself). */
export function wikiUrl(card: Pick<Card, 'name'>): string {
  const page = card.name.split(' / ')[0]!.replace(/ /g, '_');
  return `https://wiki.dominionstrategy.com/index.php/${encodeURIComponent(page)}`;
}
