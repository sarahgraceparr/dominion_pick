/**
 * Builds src/core/data/cards.json from the open dominiontabs card database.
 *
 *   npm run build:data
 *
 * The upstream revision is pinned so the build is reproducible. Card rules
 * text is used only to derive classification tags and is NOT written to the
 * output (it is © Rio Grande Games and licensed for non-commercial use only).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deriveTags } from './lib/derive-tags';
import { TAG_OVERRIDES } from './tag-overrides';
import type { Card, CardDatabase, CardKind, Cost, Product, Tag } from '../src/core/types';
import { LANDSCAPE_TYPES } from '../src/core/types';
import { slug } from '../src/core/slug';

const REPO = 'sumpfork/dominiontabs';
const REVISION = '316db5f684d1db287aaae931396500741ee34bd5';
const BASE = `https://raw.githubusercontent.com/${REPO}/${REVISION}/card_db_src`;

interface RawCard {
  card_tag: string;
  cardset_tags: string[];
  cost?: string;
  debtcost?: string;
  potcost?: string | number;
  types: string[];
  randomizer?: boolean;
  group_tag?: string;
  group_top?: boolean;
  count?: string;
}

/** The physical products a player can own, mapped to upstream set tags. */
export const PRODUCTS: (Product & { setTag: string })[] = [
  { id: 'base1', setTag: 'dominion1stEdition', name: 'Dominion', edition: '1st Edition', order: 1 },
  { id: 'base2', setTag: 'dominion2ndEdition', name: 'Dominion', edition: '2nd Edition', order: 2 },
  { id: 'base2up', setTag: 'dominion2ndEditionUpgrade', name: 'Dominion', edition: '2nd Edition Upgrade Pack', order: 3 },
  { id: 'intrigue1', setTag: 'intrigue1stEdition', name: 'Intrigue', edition: '1st Edition', order: 4 },
  { id: 'intrigue2', setTag: 'intrigue2ndEdition', name: 'Intrigue', edition: '2nd Edition', order: 5 },
  { id: 'intrigue2up', setTag: 'intrigue2ndEditionUpgrade', name: 'Intrigue', edition: '2nd Edition Upgrade Pack', order: 6 },
  { id: 'seaside1', setTag: 'seaside1stEdition', name: 'Seaside', edition: '1st Edition', order: 7 },
  { id: 'seaside2', setTag: 'seaside2ndEdition', name: 'Seaside', edition: '2nd Edition', order: 8 },
  { id: 'seaside2up', setTag: 'seaside2ndEditionUpgrade', name: 'Seaside', edition: '2nd Edition Upgrade Pack', order: 9 },
  { id: 'alchemy', setTag: 'alchemy', name: 'Alchemy', order: 10 },
  { id: 'prosperity1', setTag: 'prosperity1stEdition', name: 'Prosperity', edition: '1st Edition', order: 11 },
  { id: 'prosperity2', setTag: 'prosperity2ndEdition', name: 'Prosperity', edition: '2nd Edition', order: 12 },
  { id: 'prosperity2up', setTag: 'prosperity2ndEditionUpgrade', name: 'Prosperity', edition: '2nd Edition Upgrade Pack', order: 13 },
  { id: 'cornucopia1', setTag: 'cornucopia1stEdition', name: 'Cornucopia', edition: '1st Edition', order: 14 },
  { id: 'hinterlands1', setTag: 'hinterlands1stEdition', name: 'Hinterlands', edition: '1st Edition', order: 15 },
  { id: 'hinterlands2', setTag: 'hinterlands2ndEdition', name: 'Hinterlands', edition: '2nd Edition', order: 16 },
  { id: 'hinterlands2up', setTag: 'hinterlands2ndEditionUpgrade', name: 'Hinterlands', edition: '2nd Edition Upgrade Pack', order: 17 },
  { id: 'darkages', setTag: 'darkAges', name: 'Dark Ages', order: 18 },
  { id: 'guilds1', setTag: 'guilds1stEdition', name: 'Guilds', edition: '1st Edition', order: 19 },
  { id: 'cornguilds2', setTag: 'cornucopiaAndGuilds2ndEdition', name: 'Cornucopia & Guilds', edition: '2nd Edition', order: 20 },
  { id: 'cornucopia2up', setTag: 'cornucopia2ndEditionUpgrade', name: 'Cornucopia', edition: '2nd Edition Upgrade Pack', order: 21 },
  { id: 'guilds2up', setTag: 'guilds2ndEditionUpgrade', name: 'Guilds', edition: '2nd Edition Upgrade Pack', order: 22 },
  { id: 'adventures', setTag: 'adventures', name: 'Adventures', order: 23 },
  { id: 'empires', setTag: 'empires', name: 'Empires', order: 24 },
  { id: 'nocturne', setTag: 'nocturne', name: 'Nocturne', order: 25 },
  { id: 'renaissance', setTag: 'renaissance', name: 'Renaissance', order: 26 },
  { id: 'menagerie', setTag: 'menagerie', name: 'Menagerie', order: 27 },
  { id: 'allies', setTag: 'allies', name: 'Allies', order: 28 },
  { id: 'plunder', setTag: 'plunder', name: 'Plunder', order: 29 },
  { id: 'risingsun', setTag: 'risingSun', name: 'Rising Sun', order: 30 },
  { id: 'promo', setTag: 'promo', name: 'Promos', order: 31 },
];

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()) as T;
}

function parseCost(raw: RawCard): Cost {
  const printed = raw.cost ?? '';
  const cost: Cost = { coins: Number.parseInt(printed, 10) || 0 };
  if (printed.includes('*')) cost.variable = true;
  if (raw.potcost && Number(raw.potcost) > 0) cost.potion = true;
  if (raw.debtcost && Number(raw.debtcost) > 0) cost.debt = Number(raw.debtcost);
  return cost;
}

function kindOf(raw: RawCard): CardKind | undefined {
  if (raw.types.includes('Ally')) return 'ally';
  if (raw.types.includes('Prophecy')) return 'prophecy';
  if (raw.types.some((t) => (LANDSCAPE_TYPES as readonly string[]).includes(t))) return 'landscape';
  if (raw.randomizer === false) return undefined; // non-supply or base cards
  if (raw.types.includes('Action') || raw.types.includes('Treasure') || raw.types.includes('Victory') || raw.types.includes('Night')) {
    return 'kingdom';
  }
  return undefined;
}

export async function build(): Promise<CardDatabase> {
  const raw = await fetchJson<RawCard[]>('cards_db.json');
  const text = await fetchJson<Record<string, { description?: string }>>('en_us/cards_en_us.json');
  const setTagToProduct = new Map(PRODUCTS.map((p) => [p.setTag, p.id]));

  // Split piles ("Sauna - Avanto", Allies' "Augurs") have no rules text of
  // their own: classify them by the union of their component cards' text.
  const groupText = new Map<string, string[]>();
  for (const r of raw) {
    if (!r.group_tag || r.group_top) continue;
    const list = groupText.get(r.group_tag) ?? [];
    list.push(text[r.card_tag]?.description ?? '');
    groupText.set(r.group_tag, list);
  }

  const byId = new Map<string, Card>();
  for (const r of raw) {
    const kind = kindOf(r);
    if (!kind) continue;
    const products = r.cardset_tags.map((t) => setTagToProduct.get(t)).filter((p): p is string => !!p);
    if (products.length === 0) continue;

    const name = r.card_tag.replace(/ - /g, ' / ');
    const id = slug(name);
    const cost = parseCost(r);
    let body = text[r.card_tag]?.description ?? '';
    const isSplit = r.count === '0' && r.group_tag && r.group_top;
    if (isSplit) body = (groupText.get(r.group_tag!) ?? []).join(' <line> ');
    else if (r.group_top && r.group_tag) body = `${body} <line> ${(groupText.get(r.group_tag) ?? []).join(' <line> ')}`;

    const derived = new Set<Tag>(deriveTags(body, r.types, cost));
    const override = TAG_OVERRIDES[name];
    override?.add?.forEach((t) => derived.add(t));
    override?.remove?.forEach((t) => derived.delete(t));

    const existing = byId.get(id);
    if (existing) {
      existing.products = [...new Set([...existing.products, ...products])];
      continue;
    }
    byId.set(id, { id, name, kind, products, cost, types: r.types, tags: [...derived].sort() });
  }

  const unknownOverrides = Object.keys(TAG_OVERRIDES).filter((n) => !byId.has(slug(n)));
  if (unknownOverrides.length) throw new Error(`Overrides for unknown cards: ${unknownOverrides.join(', ')}`);

  const cards = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  const used = new Set(cards.flatMap((c) => c.products));
  return {
    source: { repo: REPO, revision: REVISION },
    products: PRODUCTS.filter((p) => used.has(p.id)).map(({ setTag: _setTag, ...p }) => p),
    cards,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = await build();
  const out = fileURLToPath(new URL('../src/core/data/cards.json', import.meta.url));
  writeFileSync(out, JSON.stringify(db, null, 1) + '\n');
  console.log(`Wrote ${db.cards.length} cards across ${db.products.length} products to ${out}`);
}
