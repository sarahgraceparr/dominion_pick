import type { Card, Tag } from '../core';
import { allProducts } from '../core';

/** Friendly names for the tags shown on card tiles, in display priority order. */
export const TAG_LABELS: Partial<Record<Tag, string>> = {
  village: 'Village',
  draw: 'Draw',
  cantrip: 'Cantrip',
  trasher: 'Trashing',
  remodeler: 'Remodel',
  gainer: 'Gainer',
  plusBuy: '+Buy',
  economy: 'Money',
  sifter: 'Sifting',
  throne: 'Throne',
  attackCurser: 'Curser',
  attackHandsize: 'Hand attack',
  attackJunker: 'Junker',
  attackDeck: 'Deck attack',
  defense: 'Defense',
  altVP: 'Alt VP',
  costReducer: 'Cost reducer',
  trashBenefit: 'Trash payoff',
};

export function roleLabels(card: Card, max = 4): string[] {
  const labels = (Object.keys(TAG_LABELS) as Tag[]).filter((t) => card.tags.includes(t)).map((t) => TAG_LABELS[t]!);
  if (labels.length === 0 && card.tags.includes('attack')) labels.push('Attack');
  return labels.slice(0, max);
}

const productNames = new Map(allProducts().map((p) => [p.id, p.edition ? `${p.name} (${p.edition})` : p.name]));

export function productLabel(id: string): string {
  return productNames.get(id) ?? id;
}

/** Short set name for a card tile; prefers a product the player owns. */
export function setLabel(card: Card, owned: readonly string[]): string {
  const id = card.products.find((p) => owned.includes(p)) ?? card.products[0]!;
  return allProducts().find((p) => p.id === id)?.name ?? id;
}

export function costLabel(card: Card): string {
  if (card.kind === 'ally' || card.kind === 'prophecy') return '';
  const parts: string[] = [];
  if (card.cost.coins > 0 || (!card.cost.potion && !card.cost.debt)) parts.push(`$${card.cost.coins}`);
  if (card.cost.potion) parts.push('P');
  if (card.cost.debt) parts.push(`${card.cost.debt}D`);
  return parts.join(' ') + (card.cost.variable ? '*' : '');
}

/** CSS modifier for the card's colour band, following the printed card frames. */
export function frameClass(card: Card): string {
  const t = card.types;
  if (card.kind !== 'kingdom') return 'frame-landscape';
  if (t.includes('Night')) return 'frame-night';
  if (t.includes('Treasure')) return 'frame-treasure';
  if (t.includes('Victory')) return 'frame-victory';
  if (t.includes('Reaction')) return 'frame-reaction';
  if (t.includes('Duration')) return 'frame-duration';
  if (t.includes('Reserve')) return 'frame-reserve';
  if (t.includes('Attack')) return 'frame-attack';
  return 'frame-action';
}
