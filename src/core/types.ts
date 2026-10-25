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

/**
 * Finer-grained mechanics: what a card *produces* and what it *reacts to*.
 * Linking producers to reactors is how chains and loops are found
 * (see interactions.ts).
 */
export const MECHANICS = [
  // producers
  'trashAny', // trashes a card of your choice from your hand
  'trashAction', // trashes an Action card from your hand
  'trashTreasure', // trashes a Treasure (or Copper) from your hand
  'trashSelf', // can trash itself
  'gainLoot', // gains Loot (Treasures costing $7)
  'gainGold', // gains a Gold
  'selfJunk', // hands its owner Ruins (Action–Ruins: two types each)
  'selfReplicate', // gains copies of itself
  'discards', // you discard cards from hand for a benefit
  'refund', // pays out based on the cost of the trashed card
  'fromTrash', // gains or plays cards from the trash
  'manyBuys', // +2 Buys or more
  'gainAttack', // gains an Attack card (Squire, when trashed)
  'gainTreasure', // gains Silvers, Golds or copies of Treasures
  'coffers', // produces Coffers
  'topdeckSetup', // arranges or puts cards on top of your deck
  // reactors
  'onTrashSelf', // does something when it is trashed
  'returnsToHand', // comes back to your hand when trashed
  'onTrashAny', // reacts whenever one of your cards is trashed
  'onGainTreasure5', // reacts when a Treasure costing $5+ is gained
  'onDiscard', // reacts when discarded outside Clean-up
  'typeCount', // scales with the number of types a card has
  'startsInDeck', // a pile you start the game with (Inherited)
  'treasurePayoff', // rewards Treasures in play or in your deck (Bank, Venture, Coppersmith)
  'varietyPayoff', // rewards differently named cards (Fairgrounds, Harvest, Menagerie)
  'actionCount', // rewards playing many Actions in a turn (Conspirator, Peddler)
  'overpay', // can be overpaid for
  'extraTurn', // gives an extra turn (Outpost)
  'nameCard', // names a card and checks the top of your deck (Wishing Well, Mystic)
  'topdeckSelf', // puts itself back on top of your deck (Treasury, Alchemist)
  'reveals', // reveals your cards
  'onReveal', // rewards being revealed (Patron)
  'typeBonus', // pays out per card type (Ironmonger, Tribute)
  'victoryRemodel', // trashes a Victory card to gain a better one (Rebuild)
  'durationPayoff', // rewards gaining or having Durations (Sailor)
  'onGainAction', // rewards gaining Action cards (Collection, Academy)
] as const;

export type Mechanic = (typeof MECHANICS)[number];

export const LANDSCAPE_TYPES = ['Event', 'Landmark', 'Project', 'Way', 'Trait'] as const;
export type LandscapeType = (typeof LANDSCAPE_TYPES)[number];

/** 'shelter' cards are never in the Supply; they matter when the setup uses Shelters. */
export type CardKind = 'kingdom' | 'landscape' | 'ally' | 'prophecy' | 'shelter';

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
  mechanics: Mechanic[];
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

export interface Synergy {
  /** 'chain': linked by mechanics (see interactions.ts); 'combo': curated; 'role': generic role pairing */
  kind: 'chain' | 'combo' | 'role';
  cards: string[];
  /** short human readable reason */
  reason: string;
  /** for chains: how each link works, in play order */
  steps?: string[];
  /** the chain can repeat within a turn */
  loop?: boolean;
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
  /** kingdom pile this note applies to (e.g. the pile a Trait sits on) */
  targetId?: string;
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
