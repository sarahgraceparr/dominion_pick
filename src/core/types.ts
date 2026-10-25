/**
 * Domain types for Dominion kingdom generation.
 *
 * The card database is derived at build time (see scripts/build-card-data.ts)
 * and contains only game facts (names, costs, types, sets) plus our own
 * derived classification tags — never the copyrighted card text.
 */

/** Functional roles a card can play in a deck. */
export const TAGS = [
  'village', // +2 Actions or more (or Villagers): lets you play several terminals
  'cantrip', // +1 Card +1 Action: replaces itself
  'draw', // +2 Cards or more, or draw-to-X
  'terminal', // an Action that gives no +Action
  'trasher', // removes your own cards (deck thinning)
  'gainer', // gains cards without buying them
  'remodeler', // trashes a card to gain a better one
  'plusBuy', // gives +Buy
  'economy', // produces coins / Coffers
  'sifter', // discards to draw (improves hand quality)
  'throne', // plays another card multiple times
  'attack',
  'attackCurser', // gives other players Curses
  'attackHandsize', // makes other players discard
  'attackJunker', // gives other players junk (Ruins, Coppers...)
  'attackDeck', // messes with or trashes from other players' decks
  'defense', // protects against Attacks
  'altVP', // victory points beyond Provinces (Victory kingdom cards, VP tokens)
  'costReducer', // makes cards cheaper
  'trashBenefit', // rewards you when it (or something) is trashed
  'duration', // has effects on future turns
  'complex', // unusual mechanics: Potion/Debt costs, Night, Boons/Hexes, Reserve...
] as const;

export type Tag = (typeof TAGS)[number];

export const LANDSCAPE_TYPES = ['Event', 'Landmark', 'Project', 'Way', 'Trait'] as const;
export type LandscapeType = (typeof LANDSCAPE_TYPES)[number];

export type CardKind = 'kingdom' | 'landscape' | 'ally' | 'prophecy';

export interface Cost {
  coins: number;
  potion?: boolean;
  debt?: number;
  /** cost printed with an asterisk (split piles, variable cost) */
  variable?: boolean;
}

export interface Card {
  /** stable identifier (slug of the name) */
  id: string;
  name: string;
  kind: CardKind;
  /** product ids this card ships in (see Product) */
  products: string[];
  cost: Cost;
  types: string[];
  tags: Tag[];
}

export interface Product {
  id: string;
  name: string;
  /** e.g. "1st Edition", "2nd Edition", "Upgrade Pack" */
  edition?: string;
  /** stable display order */
  order: number;
}

export interface CardDatabase {
  /** pinned upstream revision the data was derived from */
  source: { repo: string; revision: string };
  products: Product[];
  cards: Card[];
}

export type AttackPreference = 'none' | 'some' | 'any';

export interface GenerateOptions {
  /** product ids the player owns; empty means "everything" */
  products: string[];
  /** number of landscapes (Events, Projects, Ways, Landmarks, Traits) */
  landscapes: number;
  attacks: AttackPreference;
  /** allow Potion-cost and Debt-cost cards and other complex mechanics */
  allowComplex: boolean;
  /** maximum number of distinct products the kingdom may draw from (0 = no limit) */
  maxProducts: number;
  /** card ids that must be in the kingdom */
  locked: string[];
  /** card ids that must not be in the kingdom */
  banned: string[];
}

export interface Synergy {
  cards: string[];
  /** short human readable reason */
  reason: string;
  weight: number;
}

export interface ScoreBreakdown {
  total: number;
  parts: { label: string; value: number }[];
  /** detected deck archetype hints, e.g. "Engine", "Big Money" */
  archetypes: string[];
}

export interface SetupNote {
  title: string;
  detail: string;
  /** card id of an extra card added to the setup (e.g. the Bane) */
  cardId?: string;
}

export interface Kingdom {
  seed: string;
  cards: Card[];
  landscapes: Card[];
  /** Ally / Prophecy chosen because of Liaison / Omen cards */
  extras: Card[];
  setup: SetupNote[];
  synergies: Synergy[];
  score: ScoreBreakdown;
}
