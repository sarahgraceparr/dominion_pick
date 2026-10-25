/**
 * Imports the official "recommended kingdoms" (from the rulebooks) as card
 * names, using the MIT-licensed data of github.com/blakevanlan/dominion-randomizer.
 *
 *   git clone --depth 1 https://github.com/blakevanlan/dominion-randomizer /tmp/randomizer
 *   npx tsx scripts/import-recommended.ts /tmp/randomizer
 *
 * Writes scripts/data/recommended-kingdoms.json, used by the analysis script
 * and by tests as a benchmark of kingdoms the designers consider fun.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { database } from '../src/core/cards';
import type { Card } from '../src/core/types';

interface RawKingdom {
  name: string;
  sets?: string[];
  supply?: string[];
  events?: string[];
  landmarks?: string[];
  projects?: string[];
  ways?: string[];
  traits?: string[];
  allies?: string[];
  prophecies?: string[];
  boons?: string[];
  bane?: string;
  metadata?: { colonies?: boolean; shelters?: boolean };
}

export interface RecommendedKingdom {
  name: string;
  sets: string[];
  cards: string[];
  landscapes: string[];
  /** Ally / Prophecy */
  extras: string[];
  traits: { trait: string; target: string }[];
  bane?: string;
  shelters: boolean;
  colonies: boolean;
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const byKey = new Map<string, Card>();
for (const c of database.cards) {
  byKey.set(key(c.name), c);
  // Split piles ("Sauna / Avanto") are listed under their top card.
  if (c.name.includes(' / ')) byKey.set(key(c.name.split(' / ')[0]!), c);
}

const unmatched = new Set<string>();

/** "plunder_event_peril" -> "Peril" */
function resolve(id: string): string | undefined {
  const suffix = id.trim().split('_').pop()!;
  const card = byKey.get(suffix);
  if (!card) unmatched.add(id.trim());
  return card?.name;
}

function convert(raw: RawKingdom): RecommendedKingdom {
  const names = (ids?: string[]) => (ids ?? []).map(resolve).filter((n): n is string => !!n);
  return {
    name: raw.name.trim(),
    sets: raw.sets ?? [],
    cards: names(raw.supply),
    landscapes: names([...(raw.events ?? []), ...(raw.landmarks ?? []), ...(raw.projects ?? []), ...(raw.ways ?? [])]).concat(
      names((raw.traits ?? []).map((t) => t.split('->')[0]!)),
    ),
    extras: names([...(raw.allies ?? []), ...(raw.prophecies ?? [])]),
    traits: (raw.traits ?? [])
      .map((t) => t.split('->').map(resolve))
      .filter((p): p is [string, string] => !!p[0] && !!p[1])
      .map(([trait, target]) => ({ trait, target })),
    ...(raw.bane && resolve(raw.bane) ? { bane: resolve(raw.bane) } : {}),
    shelters: raw.metadata?.shelters ?? false,
    colonies: raw.metadata?.colonies ?? false,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) throw new Error('usage: import-recommended.ts <path to dominion-randomizer clone>');
  const files = readdirSync(join(dir, 'kingdoms')).filter((f) => f.endsWith('.yaml') && !f.startsWith('my '));
  const kingdoms = files.flatMap((f) =>
    (parse(readFileSync(join(dir, 'kingdoms', f), 'utf8')) as { kingdoms: RawKingdom[] }).kingdoms.map(convert),
  );
  const out = fileURLToPath(new URL('./data/recommended-kingdoms.json', import.meta.url));
  writeFileSync(out, JSON.stringify(kingdoms, null, 1) + '\n');
  console.log(`Wrote ${kingdoms.length} kingdoms to ${out}`);
  if (unmatched.size) console.log(`Unmatched ids (${unmatched.size}): ${[...unmatched].join(', ')}`);
}
