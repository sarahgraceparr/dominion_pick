import { describe, expect, it } from 'vitest';
import { deriveTags, normalize } from './derive-tags';

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
