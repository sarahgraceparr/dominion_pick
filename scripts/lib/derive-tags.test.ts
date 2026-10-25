import { describe, expect, it } from 'vitest';
import { deriveMechanics, deriveTags, normalize } from './derive-tags';

// Paraphrased, made-up card texts in the upstream markup format.
describe('deriveTags', () => {
  it('detects villages and cantrips', () => {
    expect(deriveTags('+1 Card<br>+2 Actions', ['Action'])).toEqual(['village']);
    expect(deriveTags('+1 Card<br>+1 Action<br>+1 Coin', ['Action'])).toEqual(['cantrip', 'economy']);
  });

  it('detects terminal draw', () => {
    expect(deriveTags('+3 Cards', ['Action'])).toEqual(['draw', 'terminal']);
  });

  it('ignores below-the-line text for play effects', () => {
    expect(deriveTags('+2 Coins<line>When you gain this, +2 Actions', ['Action'])).not.toContain('village');
  });

  it('detects trashing, gaining and remodelling', () => {
    expect(deriveTags('Trash up to 3 cards from your hand.', ['Action'])).toContain('trasher');
    expect(deriveTags('Gain a card costing up to 4 Coins.', ['Action'])).toContain('gainer');
    expect(deriveTags('Trash a card from your hand. Gain a card costing up to 2 Coins more than it.', ['Action'])).toEqual(
      expect.arrayContaining(['trasher', 'gainer', 'remodeler']),
    );
  });

  it('classifies attacks', () => {
    expect(deriveTags('+2 Cards<n>Each other player gains a Curse.', ['Action', 'Attack'])).toEqual(
      expect.arrayContaining(['attack', 'attackCurser']),
    );
    expect(deriveTags('Each other player discards down to 3 cards in hand.', ['Action', 'Attack'])).toContain('attackHandsize');
    expect(deriveTags('Each other player gains a Ruins.', ['Action', 'Attack'])).toContain('attackJunker');
  });

  it('only gives attack tags to Attack cards', () => {
    expect(deriveTags('Each other player gains a Curse.', ['Action'])).not.toContain('attackCurser');
  });

  it('detects defenses, throne, +Buy, cost reducers and alt VP', () => {
    expect(deriveTags('+2 Cards<line>When another player plays an Attack card, you may reveal this.', ['Action', 'Reaction'])).toContain(
      'defense',
    );
    const throne = deriveTags('You may play an Action card from your hand twice.', ['Action']);
    expect(throne).toContain('throne');
    expect(throne).not.toContain('terminal');
    expect(deriveTags('+1 Buy<br>+1 Coin<n>Cards cost 1 Coin less this turn.', ['Action'])).toEqual(
      expect.arrayContaining(['plusBuy', 'costReducer']),
    );
    expect(deriveTags('Worth 1 <VP> per 10 cards.', ['Victory'])).toEqual(['altVP']);
  });

  it('marks complex mechanics', () => {
    expect(deriveTags('+1 Card', ['Action'], { potion: true })).toContain('complex');
    expect(deriveTags('+1 Card', ['Action', 'Night'])).toContain('complex');
    expect(deriveTags('+1 Card', ['Action'], { debt: 4 })).toContain('complex');
  });

  it('treats treasures as economy', () => {
    expect(deriveTags('2 <*COIN*>', ['Treasure'])).toEqual(['economy']);
  });
});

describe('normalize', () => {
  it('flattens markup', () => {
    expect(normalize('+1 Card<br>+2 Actions<line>Worth 2 <VP>')).toBe('+1 card +2 actions || worth 2 <vp>');
  });
});

describe('deriveMechanics', () => {
  it('distinguishes what can be trashed', () => {
    expect(deriveMechanics('X', 'Trash a card from your hand.', ['Action'])).toContain('trashAny');
    expect(deriveMechanics('X', 'You may trash an Action card from your hand to gain a Loot.', ['Event'])).toEqual([
      'gainLoot',
      'trashAction',
    ]);
    expect(deriveMechanics('X', 'You may trash a Copper from your hand for +3 Coins.', ['Action'])).toEqual(['trashTreasure']);
  });

  it('reads below-the-line triggers', () => {
    expect(deriveMechanics('X', '+2 Actions<line>When you trash this, put it into your hand.', ['Action'])).toEqual([
      'onTrashSelf',
      'returnsToHand',
    ]);
    expect(deriveMechanics('X', '+1 Buy<line>When one of your cards is trashed, you may discard this to gain a Gold.', ['Action'])).toEqual(
      ['gainGold', 'gainTreasure', 'onTrashAny'],
    );
    expect(deriveMechanics('X', '<line>When you discard this other than during Clean-up, gain a Gold.', ['Victory'])).toContain(
      'onDiscard',
    );
    expect(deriveMechanics('X', '+1 Coin<line>When you discard this from play, topdeck a Treasure.', ['Action'])).not.toContain(
      'onDiscard',
    );
  });

  it('spots self-replication by card name', () => {
    expect(deriveMechanics('Mice', '+1 Card +1 Action. Gain a Mice.', ['Action'])).toContain('selfReplicate');
    expect(deriveMechanics('Mice', '+1 Card +1 Action. Gain a Silver.', ['Action'])).not.toContain('selfReplicate');
  });

  it('detects refunds, type counting, the trash as a resource and $5+ Treasure triggers', () => {
    expect(deriveMechanics('X', 'Trash a card from your hand. +1 Coin per 1 Coin it costs.', ['Treasure'])).toContain('refund');
    expect(deriveMechanics('X', 'Trash a card from your hand. +2 Cards per type it has.', ['Action'])).toContain('typeCount');
    expect(deriveMechanics('X', 'Gain a card from the trash.', ['Action'])).toContain('fromTrash');
    expect(deriveMechanics('X', 'The next time anyone gains a Treasure costing 5 Coin or more, gain a Loot.', ['Action'])).toEqual([
      'gainLoot',
      'onGainTreasure5',
    ]);
  });

  it('marks Looters and Ruins-gainers as self-junking', () => {
    expect(deriveMechanics('X', '+5 Coin<line>When you gain this, gain 2 Ruins.', ['Action'])).toContain('selfJunk');
    expect(deriveMechanics('X', '+1 Card', ['Action', 'Looter'])).toContain('selfJunk');
  });

  it('detects the themes found in the recommended kingdoms', () => {
    expect(deriveMechanics('X', '+1 Coin<line>When something causes you to reveal this, +1 Coffers.', ['Action'])).toEqual([
      'coffers',
      'onReveal',
    ]);
    expect(
      deriveMechanics('X', '+1 Card<line>When you discard this from play, you may put this on top of your deck.', ['Action']),
    ).toContain('topdeckSelf');
    expect(deriveMechanics('X', 'Reveal the top card; if it is an Action card, +1 Action; Treasure card, +1 Coin.', ['Action'])).toContain(
      'typeBonus',
    );
    expect(deriveMechanics('X', '+1 Coin per Treasure card you have in play.', ['Treasure'])).toContain('treasurePayoff');
    expect(deriveMechanics('X', 'Worth 2 VP for every 5 differently named cards.', ['Victory'])).toContain('varietyPayoff');
    expect(deriveMechanics('X', "If you've played 3 or more Actions this turn, +1 Card.", ['Action'])).toContain('actionCount');
    expect(deriveMechanics('X', '<line>When you buy this, you may overpay for it.', ['Action'])).toContain('overpay');
    expect(deriveMechanics('X', 'Take an extra turn after this one.', ['Action', 'Duration'])).toContain('extraTurn');
    expect(deriveMechanics('X', 'Name a card. Reveal the top card of your deck.', ['Action'])).toContain('nameCard');
    expect(deriveMechanics('X', 'This turn, when you gain an Action card, +1 VP.', ['Treasure'])).toContain('onGainAction');
  });

  it('counts revealing several cards and keeping them as draw', () => {
    expect(deriveTags('+1 Action. Reveal the top 3 cards of your deck. Put the others into your hand.', ['Action'])).toContain('draw');
    expect(deriveTags('Reveal the top card of your deck. If it is an Action, put it into your hand.', ['Action'])).not.toContain('draw');
  });
});
