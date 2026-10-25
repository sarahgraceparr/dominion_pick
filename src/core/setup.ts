import type { Rng } from './rng';
import type { Card, SetupNote } from './types';

export interface SetupInput {
  kingdom: Card[];
  landscapes: Card[];
  /** kingdom cards the player owns that are not already used */
  unusedKingdom: Card[];
  /** Ally cards the player owns */
  allies: Card[];
  /** Prophecy cards the player owns */
  prophecies: Card[];
}

export interface SetupResult {
  extras: Card[];
  notes: SetupNote[];
  /** players start with Shelters instead of Estates */
  shelters: boolean;
  /** each Trait and the kingdom pile it was placed on */
  traits: { trait: Card; target: Card }[];
}

const names = (cards: Card[]) => new Set(cards.map((c) => c.name));
const fromProduct = (cards: Card[], ids: string[]) => cards.filter((c) => c.products.some((p) => ids.includes(p))).length;

/**
 * Applies the official setup rules that depend on which cards are in the
 * kingdom (Bane, Colony/Platinum, Shelters, Allies, Prophecies...).
 */
export function buildSetup(input: SetupInput, rng: Rng): SetupResult {
  const { kingdom, landscapes } = input;
  const all = [...kingdom, ...landscapes];
  const present = names(all);
  const extras: Card[] = [];
  const notes: SetupNote[] = [];
  let unused = [...input.unusedKingdom];

  const takeUnused = (title: string, detail: string, pred: (c: Card) => boolean) => {
    const choices = unused.filter(pred);
    if (choices.length === 0) {
      notes.push({ title, detail: `${detail} (none of your cards qualify — pick one by hand)` });
      return;
    }
    const card = rng.pick(choices);
    unused = unused.filter((c) => c !== card);
    notes.push({ title, detail: `${detail}: ${card.name}`, cardId: card.id });
  };

  if (present.has('Young Witch')) {
    takeUnused(
      'Bane',
      'Young Witch needs an extra Kingdom pile costing $2 or $3',
      (c) => !c.cost.potion && !c.cost.debt && c.cost.coins >= 2 && c.cost.coins <= 3,
    );
  }
  if (present.has('Ferryman')) {
    takeUnused(
      'Ferryman',
      'Set aside an unused Kingdom pile costing $3 or $4',
      (c) => c.cost.coins >= 3 && c.cost.coins <= 4 && !c.cost.potion && !c.cost.debt,
    );
  }
  if (present.has('Riverboat')) {
    takeUnused(
      'Riverboat',
      'Set aside an unused non-Duration Action costing $5',
      (c) => c.types.includes('Action') && !c.types.includes('Duration') && c.cost.coins === 5 && !c.cost.potion && !c.cost.debt,
    );
  }
  if (present.has('Way of the Mouse')) {
    takeUnused(
      'Way of the Mouse',
      'Set aside an unused Action costing $2 or $3',
      (c) => c.types.includes('Action') && c.cost.coins >= 2 && c.cost.coins <= 3 && !c.cost.potion && !c.cost.debt,
    );
  }
  if (present.has('Approaching Army')) {
    takeUnused('Approaching Army', 'Add an Attack Kingdom pile to the Supply', (c) => c.types.includes('Attack'));
  }

  // Official recommendation: use Colony/Platinum (Shelters) with a probability
  // equal to the share of Prosperity (Dark Ages) cards in the kingdom.
  const prosperity = fromProduct(kingdom, ['prosperity1', 'prosperity2', 'prosperity2up']);
  if (prosperity > 0 && rng.next() < prosperity / kingdom.length) {
    notes.push({ title: 'Colony & Platinum', detail: 'Add Colony and Platinum piles to the Supply' });
  }
  const darkAges = fromProduct(kingdom, ['darkages']);
  const shelters = darkAges > 0 && rng.next() < darkAges / kingdom.length;
  if (shelters) {
    notes.push({ title: 'Shelters', detail: 'Each player starts with Necropolis, Hovel and Overgrown Estate instead of 3 Estates' });
  }

  // Each Trait goes on a random Action or Treasure Kingdom pile (one Trait per pile).
  const traits: SetupResult['traits'] = [];
  let traitPiles = kingdom.filter((c) => c.types.includes('Action') || c.types.includes('Treasure'));
  for (const trait of landscapes.filter((l) => l.types.includes('Trait'))) {
    if (traitPiles.length === 0) break;
    const target = rng.pick(traitPiles);
    traitPiles = traitPiles.filter((c) => c !== target);
    traits.push({ trait, target });
    notes.push({ title: trait.name, detail: `Put the ${trait.name} Trait on the ${target.name} pile`, targetId: target.id });
  }

  if (kingdom.some((c) => c.cost.potion)) notes.push({ title: 'Potion', detail: 'Add the Potion pile to the Supply' });
  if (all.some((c) => c.cost.debt || c.types.includes('Debt'))) notes.push({ title: 'Debt', detail: 'Put out the Debt tokens' });
  if (kingdom.some((c) => c.types.includes('Looter'))) notes.push({ title: 'Ruins', detail: 'Add the shuffled Ruins pile to the Supply' });
  if (kingdom.some((c) => c.types.includes('Fate')))
    notes.push({ title: 'Boons', detail: "Shuffle the Boons deck (and use Will-o'-Wisp)" });
  if (kingdom.some((c) => c.types.includes('Doom')))
    notes.push({ title: 'Hexes', detail: 'Shuffle the Hexes deck (and use Deluded/Envious/Miserable)' });
  if (present.has('Druid')) notes.push({ title: 'Druid', detail: 'Set aside the top 3 Boons face up for Druid' });
  if (present.has('Black Market')) notes.push({ title: 'Black Market', detail: 'Build a Black Market deck from unused Kingdom cards' });
  if (present.has('Obelisk')) notes.push({ title: 'Obelisk', detail: 'Choose a random Action Supply pile for Obelisk' });

  if (kingdom.some((c) => c.types.includes('Liaison')) && input.allies.length > 0) {
    const ally = rng.pick(input.allies);
    extras.push(ally);
    notes.push({ title: 'Ally', detail: `Liaison cards use an Ally: ${ally.name}. Each player starts with 1 Favor.`, cardId: ally.id });
  }
  if (kingdom.some((c) => c.types.includes('Omen')) && input.prophecies.length > 0) {
    const prophecy = rng.pick(input.prophecies);
    extras.push(prophecy);
    notes.push({ title: 'Prophecy', detail: `Omen cards use a Prophecy: ${prophecy.name}. Put Sun tokens on it.`, cardId: prophecy.id });
  }

  return { extras, notes, shelters, traits };
}
