import type { Tag } from '../src/core/types';

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
