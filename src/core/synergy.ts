import { COMBOS } from './combos';
import type { Card, Synergy, Tag } from './types';

const has = (c: Card, t: Tag) => c.tags.includes(t);
const isTerminalDraw = (c: Card) => has(c, 'draw') && has(c, 'terminal');
// Cost is a rough but serviceable proxy for card strength.
const isStrongTerminal = (c: Card) =>
  has(c, 'terminal') && c.cost.coins >= 4 && (has(c, 'draw') || has(c, 'attack') || has(c, 'gainer') || has(c, 'plusBuy'));
const isPureVictory = (c: Card) =>
  c.kind === 'kingdom' && c.types.includes('Victory') && !c.types.includes('Action') && !c.types.includes('Treasure');

interface PairRule {
  a: (c: Card) => boolean;
  b: (c: Card) => boolean;
  weight: number;
  reason: (a: Card, b: Card) => string;
}

/**
 * Generic role-based synergies. Each rule is evaluated for ordered pairs of
 * distinct cards; a card pair is reported at most once per rule.
 */
const PAIR_RULES: PairRule[] = [
  {
    a: (c) => has(c, 'village'),
    b: isTerminalDraw,
    weight: 3,
    reason: (a, b) => `${a.name} gives the Actions to chain several ${b.name}`,
  },
  {
    a: (c) => has(c, 'throne'),
    b: isStrongTerminal,
    weight: 2,
    reason: (a, b) => `${a.name} doubles up a strong terminal like ${b.name}`,
  },
  {
    a: (c) => has(c, 'trasher') || has(c, 'remodeler'),
    b: (c) => has(c, 'trashBenefit'),
    weight: 3,
    reason: (a, b) => `${a.name} trashes cards, which ${b.name} rewards`,
  },
  {
    a: (c) => has(c, 'trasher') && !has(c, 'remodeler'),
    b: (c) => has(c, 'draw') && !has(c, 'trasher'),
    weight: 1,
    reason: (a, b) => `${a.name} thins your deck so ${b.name} draws your best cards`,
  },
  {
    a: (c) => has(c, 'plusBuy'),
    b: (c) => has(c, 'costReducer'),
    weight: 3,
    reason: (a, b) => `${b.name} makes cards cheaper and ${a.name} lets you buy several`,
  },
  {
    a: (c) => has(c, 'gainer') && !has(c, 'attack'),
    b: isPureVictory,
    weight: 2,
    reason: (a, b) => `${a.name} gains cards that feed an alternative VP plan with ${b.name}`,
  },
  {
    a: (c) => has(c, 'defense'),
    b: (c) => has(c, 'attack'),
    weight: 2,
    reason: (a, b) => `${a.name} gives a way to fight back against ${b.name}`,
  },
  {
    a: (c) => has(c, 'trasher') && !has(c, 'attack'),
    b: (c) => has(c, 'attackCurser') || has(c, 'attackJunker'),
    weight: 2,
    reason: (a, b) => `${a.name} can clean out the junk ${b.name} hands out`,
  },
];

const MAX_HITS_PER_RULE = 2;
/** Caps how many generic synergies one card takes part in, so multi-role cards don't dominate. */
const MAX_RULE_HITS_PER_CARD = 2;

/** Finds the synergies present among a set of kingdom cards and landscapes. */
export function findSynergies(cards: readonly Card[]): Synergy[] {
  const out: Synergy[] = [];
  const names = new Set(cards.map((c) => c.name));
  const byName = new Map(cards.map((c) => [c.name, c]));

  for (const combo of COMBOS) {
    if (!names.has(combo.card)) continue;
    const partners = combo.partners.filter((p) => names.has(p));
    if (partners.length === 0) continue;
    out.push({
      cards: [combo.card, ...partners].map((n) => byName.get(n)!.id),
      reason: `${combo.card} + ${partners.join(' / ')}: ${combo.reason}`,
      weight: combo.weight,
    });
  }

  const perCard = new Map<string, number>();
  const comboPairs = new Set(out.flatMap((s) => s.cards.slice(1).map((p) => `${s.cards[0]}|${p}`)));
  // Strongest rules first, so the per-card cap keeps the most meaningful pairs.
  for (const rule of [...PAIR_RULES].sort((a, b) => b.weight - a.weight)) {
    // Only report each rule's strongest few pairs; a board with 3 villages and
    // 3 draw cards doesn't get 9x the credit.
    let hits = 0;
    for (const a of cards) {
      if (hits >= MAX_HITS_PER_RULE || !rule.a(a)) continue;
      for (const b of cards) {
        if (hits >= MAX_HITS_PER_RULE) break;
        if (a === b || !rule.b(b)) continue;
        if (comboPairs.has(`${a.id}|${b.id}`) || comboPairs.has(`${b.id}|${a.id}`)) continue;
        if ((perCard.get(a.id) ?? 0) >= MAX_RULE_HITS_PER_CARD || (perCard.get(b.id) ?? 0) >= MAX_RULE_HITS_PER_CARD) continue;
        out.push({ cards: [a.id, b.id], reason: rule.reason(a, b), weight: rule.weight });
        hits++;
        perCard.set(a.id, (perCard.get(a.id) ?? 0) + 1);
        perCard.set(b.id, (perCard.get(b.id) ?? 0) + 1);
      }
    }
  }
  return out;
}
