/**
 * Well-known card combinations, written up in our own words from the
 * community strategy wiki. Each entry fires when the kingdom contains the
 * first card and at least one of the partners.
 */
export interface Combo {
  card: string;
  partners: string[];
  reason: string;
  weight: number;
}

export const COMBOS: Combo[] = [
  {
    card: 'Gardens',
    partners: ['Workshop', 'Ironworks', 'Woodcutter', 'Hamlet', 'Market Square', 'Lurker', 'Hoard'],
    reason: 'cheap gains and +Buy bloat your deck so every Gardens is worth more',
    weight: 4,
  },
  {
    card: 'Great Hall',
    partners: ['Ironworks'],
    reason: 'Ironworks gains Great Hall and gets both a card and an Action back',
    weight: 4,
  },
  {
    card: 'Bridge',
    partners: ["King's Court", 'Throne Room', 'Royal Carriage', 'Native Village', 'Crown'],
    reason: 'playing Bridge several times in a turn makes everything nearly free',
    weight: 6,
  },
  {
    card: 'Goons',
    partners: ['Bridge', 'Highway', 'Bridge Troll', "King's Court", 'Throne Room'],
    reason: 'Goons scores a VP per buy, and these turn one turn into many cheap buys',
    weight: 5,
  },
  {
    card: 'Treasure Map',
    partners: ['Chapel', 'Remake', 'Steward', 'Junk Dealer', 'Sentry'],
    reason: 'trash down quickly so two Treasure Maps collide and fill your deck with Gold',
    weight: 4,
  },
  {
    card: 'Tunnel',
    partners: ['Vault', 'Storeroom', 'Cellar', 'Warehouse', 'Hamlet', 'Oasis', 'Inn', 'Dungeon', 'Embassy', 'Mill'],
    reason: 'discarding Tunnel on your own turn gains you a Gold',
    weight: 4,
  },
  {
    card: 'Village Green',
    partners: ['Vault', 'Storeroom', 'Cellar', 'Warehouse', 'Hamlet', 'Oasis', 'Dungeon', 'Mill'],
    reason: 'discarding Village Green lets you play it for free',
    weight: 4,
  },
  {
    card: 'Fortress',
    partners: ['Bishop', 'Procession', 'Salvager', 'Apprentice', 'Develop', 'Remodel', 'Death Cart', 'Lurker', 'Upgrade'],
    reason: 'trashing Fortress puts it straight back into your hand',
    weight: 5,
  },
  {
    card: 'Library',
    partners: ['Festival', 'Fishing Village', 'Bazaar', 'Bandit Camp', "Worker's Village"],
    reason: 'villages that draw nothing leave a short hand for Library to refill',
    weight: 4,
  },
  {
    card: 'Necromancer',
    partners: ['Lurker', 'Death Cart', 'Procession', 'Hermit'],
    reason: 'these put Actions into the trash for Necromancer to play',
    weight: 4,
  },
  {
    card: 'Market Square',
    partners: ['Chapel', 'Steward', 'Remodel', 'Remake', 'Trading Post', 'Moneylender', 'Salvager', 'Fortress'],
    reason: 'every trash lets Market Square react and gain a Gold',
    weight: 4,
  },
  {
    card: 'Feast',
    partners: ['Throne Room', "King's Court"],
    reason: 'a Throned Feast gains two 5-cost cards for the price of one Action',
    weight: 3,
  },
  {
    card: 'Silk Road',
    partners: ['Ironworks', 'Workshop', 'Hamlet', 'Crossroads', 'Nobles', 'Great Hall', 'Mill'],
    reason: 'gaining lots of Victory cards makes every Silk Road grow',
    weight: 4,
  },
  {
    card: 'Watchtower',
    partners: ['Workshop', 'Ironworks', 'Hoard', 'Talisman', 'Haggler', 'Market Square'],
    reason: 'Watchtower trashes or top-decks the extra cards these gain',
    weight: 3,
  },
  {
    card: 'Conspirator',
    partners: ['Village', 'Festival', 'Bazaar', 'Peddler', 'Pawn', 'Great Hall', 'Shanty Town', "Worker's Village"],
    reason: 'cheap Actions quickly turn Conspirator into a cantrip',
    weight: 3,
  },
  {
    card: 'Scrying Pool',
    partners: ['Peddler', 'Pawn', 'Great Hall', 'Village', 'Hamlet', 'Lost City', 'Conspirator', 'Pageant'],
    reason: 'a deck full of Actions lets Scrying Pool draw almost everything',
    weight: 3,
  },
  {
    card: 'Highway',
    partners: ['Workshop', 'Ironworks', 'Hermit', 'Artisan', 'Groom'],
    reason: 'Highways in play let fixed-cost gainers pick up pricier cards',
    weight: 3,
  },
];
