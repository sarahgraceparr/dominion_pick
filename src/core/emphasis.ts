import type { Card, Synergy } from './types';

/** Play styles a player can ask the generator to emphasise. */
export const EMPHASES = ['attacks', 'extraTurns', 'engine', 'bigMoney', 'trashing', 'oddTreasures', 'fatDeck'] as const;
export type Emphasis = (typeof EMPHASES)[number];

const has = (c: Card, tag: Card['tags'][number]) => c.tags.includes(tag);
const mech = (c: Card, m: Card['mechanics'][number]) => c.mechanics.includes(m);
const isPureVictory = (c: Card) =>
  c.kind === 'kingdom' && c.types.includes('Victory') && !c.types.includes('Action') && !c.types.includes('Treasure');
/** Treasures that do more than make money, and Night cards. */
const isOddTreasure = (c: Card) =>
  c.types.includes('Night') ||
  (c.types.includes('Treasure') &&
    c.kind === 'kingdom' &&
    (c.tags.some((t) => t !== 'economy' && t !== 'complex') || c.mechanics.length > 0));

interface EmphasisRule {
  label: string;
  /** cards that embody this style; used to seed candidate kingdoms */
  matches: (c: Card) => boolean;
  /** extra score for a board, given its cards, landscapes and synergies */
  score: (kingdom: readonly Card[], all: readonly Card[], synergies: readonly Synergy[]) => number;
}

/** `n` items worth `each` points, counting at most `cap` of them. */
const capped = (n: number, each: number, cap: number) => Math.min(n, cap) * each;
const count = (cards: readonly Card[], pred: (c: Card) => boolean) => cards.filter(pred).length;
const TRASH_PAYOFFS: Card['mechanics'][number][] = ['onTrashSelf', 'onTrashAny', 'fromTrash', 'refund'];
const ATTACK_PROOF = /shrugs off|refills the hand|fight back/;

export const EMPHASIS_RULES: Record<Emphasis, EmphasisRule> = {
  attacks: {
    label: 'More attacks',
    matches: (c) => has(c, 'attack'),
    score: (k, all, syn) => {
      const attacks = count(k, (c) => has(c, 'attack'));
      const defenses = count(all, (c) => has(c, 'defense'));
      const attackProof = syn.filter((s) => ATTACK_PROOF.test([s.reason, ...(s.steps ?? [])].join(' '))).length;
      return capped(attacks, 4, 4) + capped(defenses, 3, 2) + capped(attackProof, 3, 3);
    },
  },
  extraTurns: {
    label: 'Extra turns',
    matches: (c) => mech(c, 'extraTurn'),
    score: (k, all) => {
      const extraTurns = count(all, (c) => mech(c, 'extraTurn'));
      const durations = count(k, (c) => c.types.includes('Duration'));
      return capped(extraTurns, 10, 2) + capped(durations, 2, 3);
    },
  },
  engine: {
    label: 'Engines & draw',
    matches: (c) => has(c, 'village') || has(c, 'draw'),
    score: (k, all) => {
      const villages = count(all, (c) => has(c, 'village'));
      const draw = count(all, (c) => has(c, 'draw'));
      const plusBuy = all.some((c) => has(c, 'plusBuy'));
      return (villages && draw ? 8 : -8) + capped(villages, 2, 2) + capped(draw, 2, 3) + (plusBuy ? 2 : 0);
    },
  },
  bigMoney: {
    label: 'Big Money',
    matches: (c) => (has(c, 'draw') && has(c, 'terminal') && c.cost.coins >= 4) || (c.types.includes('Treasure') && c.cost.coins >= 5),
    score: (k) => {
      const terminalDraw = count(k, (c) => has(c, 'draw') && has(c, 'terminal') && c.cost.coins >= 4);
      const treasures = count(k, (c) => c.types.includes('Treasure') && c.cost.coins >= 4);
      return capped(terminalDraw, 4, 2) + capped(treasures, 3, 3);
    },
  },
  trashing: {
    label: 'Trashing',
    matches: (c) => has(c, 'trasher'),
    score: (k, all) => {
      const trashers = count(all, (c) => has(c, 'trasher'));
      const payoffs = count(all, (c) => TRASH_PAYOFFS.some((m) => mech(c, m)));
      return capped(trashers, 3, 3) + capped(payoffs, 3, 3);
    },
  },
  oddTreasures: {
    label: 'Night & tricky Treasures',
    matches: isOddTreasure,
    score: (k) => capped(count(k, isOddTreasure), 4, 4),
  },
  fatDeck: {
    label: 'Gainers & fat decks',
    matches: (c) => (has(c, 'gainer') && !has(c, 'attack')) || isPureVictory(c),
    score: (k, all) => {
      const gainers = count(all, (c) => has(c, 'gainer') && !has(c, 'attack'));
      const plusBuy = count(all, (c) => has(c, 'plusBuy'));
      return capped(gainers, 2, 4) + capped(plusBuy, 1, 3) + capped(count(k, isPureVictory), 6, 2);
    },
  },
};
