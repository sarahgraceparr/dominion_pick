import type { Mechanic, Tag } from '../src/core/types';

/**
 * Hand-curated corrections to the heuristic tags from derive-tags.ts.
 * Keyed by card name as displayed (split piles use "A / B").
 * The build fails if a key does not match a card, so typos can't hide.
 */
export const TAG_OVERRIDES: Record<string, { add?: Tag[]; remove?: Tag[] }> = {
  // --- Kingdom cards ---
  Ambassador: { add: ['trasher', 'attackJunker'] },
  Apprentice: { remove: ['complex'] },
  Augurs: { add: ['draw', 'attack', 'attackCurser'] },
  Cellar: { remove: ['draw', 'cantrip'] },
  'Coin of the Realm': { add: ['village'] },
  Conclave: { add: ['village'] },
  Count: { add: ['trasher'] },
  Doctor: { add: ['trasher'] },
  Hamlet: { add: ['village', 'sifter'] },
  Joust: { remove: ['throne', 'costReducer', 'altVP'] },
  Knights: {
    remove: ['altVP', 'attackHandsize', 'economy', 'gainer', 'plusBuy', 'trashBenefit', 'trasher'],
  },
  Loan: { add: ['trasher'] },
  Lookout: { add: ['trasher', 'cantrip'] },
  Mine: { add: ['remodeler'], remove: ['trasher'] },
  Mint: { add: ['trasher', 'gainer'] },
  Peasant: { remove: ['throne'] },
  Raze: { add: ['trasher'] },
  'Royal Carriage': { add: ['throne'] },
  Scepter: { add: ['throne'] },
  Taxman: { add: ['remodeler', 'attackDeck'] },
  Tournament: { remove: ['costReducer'] },
  Wizards: { add: ['draw', 'village', 'attack'] },

  // --- Landscapes ---
  Banish: { add: ['trasher'] },
  Barracks: { add: ['village'] },
  Capitalism: { add: ['economy'] },
  Citadel: { add: ['throne'] },
  Donate: { add: ['trasher'] },
  Expedition: { add: ['draw'] },
  'Lost Arts': { add: ['village'] },
  Piazza: { add: ['village'] },
  'Road Network': { add: ['draw'] },
  Toil: { add: ['village'] },
  Training: { add: ['economy'] },
};

/** Hand-curated corrections to the mechanics from deriveMechanics(). */
export const MECHANIC_OVERRIDES: Record<string, { add?: Mechanic[]; remove?: Mechanic[] }> = {
  // Printed card: "When you trash this, gain an Attack card" (upstream text says "Action").
  Squire: { add: ['gainAttack'] },
  Apprentice: { add: ['refund'] },
  Bishop: { add: ['refund'] },
  'Death Cart': { add: ['trashAction'] },
  Procession: { add: ['trashAction'] },
  Rogue: { add: ['fromTrash'] },
  Lookout: { add: ['trashAny'] },
  Port: { add: ['selfReplicate'] },
  Experiment: { add: ['selfReplicate'] },
  // These give Ruins to the other players, not to themselves.
  Cultist: { remove: ['selfJunk'] },
  Marauder: { remove: ['selfJunk'] },
  // Traits and cards that gain *other* cards by name, not copies of themselves.
  Cursed: { remove: ['selfReplicate'] },
  Duchess: { remove: ['selfReplicate'] },
  Fawning: { remove: ['selfReplicate'] },
  Ferryman: { remove: ['selfReplicate'] },
  Friendly: { remove: ['selfReplicate'] },
  Hasty: { remove: ['selfReplicate'] },
  Nearby: { remove: ['selfReplicate'] },
  Pious: { remove: ['selfReplicate'] },
  Rich: { remove: ['selfReplicate'] },
  Transmute: { remove: ['selfReplicate'] },
  // "You may trash this from your hand" is not a when-trashed trigger.
  Hovel: { remove: ['onTrashSelf'] },
  // You start the game with a card from the pile Inherited is on.
  Inherited: { add: ['startsInDeck'] },
};
