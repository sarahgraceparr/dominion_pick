import type { Tag } from '../../src/core/types';

/**
 * Heuristically classifies a card from its rules text and types.
 *
 * Runs only at build time: the card text is used to derive tags and then
 * discarded, so no copyrighted text ends up in the shipped data. Known
 * misclassifications are corrected by hand in scripts/tag-overrides.ts.
 */
export function deriveTags(rawText: string, types: string[], cost?: { potion?: boolean; debt?: number }): Tag[] {
  const text = normalize(rawText);
  // Text below the dividing line is (mostly) triggered abilities; the play
  // effect is above it. Most role tags should only consider the play effect.
  const above = text.split(' || ')[0] ?? '';
  const tags = new Set<Tag>();
  const isAction = types.includes('Action');
  const isAttack = types.includes('Attack');

  const actions = maxNumber(above, /\+(\d+) actions?\b/g);
  const cards = maxNumber(above, /\+(\d+) cards?\b/g);
  const villagers = /villagers?\b/.test(text);

  if (actions >= 2 || (villagers && /\+\d+ villagers?/.test(text))) tags.add('village');
  if (actions === 1 && cards >= 1 && cards < 2) tags.add('cantrip');
  if (cards >= 2 || /draw until|\+1 card per\b/.test(above)) tags.add('draw');
  if (isAction && actions === 0 && !tags.has('village')) tags.add('terminal');

  if (/\+\d+ buys?\b/.test(text)) tags.add('plusBuy');
  if (/\+\d+ coins?\b|\+\d+ coffers?|\d+ <coin>|\+\$\d/.test(text) || types.includes('Treasure')) {
    tags.add('economy');
  }

  const trashesOwn =
    /trash (up to \d+|any number of|a|an|one|two|\d+)( [a-z-]+)? cards? (from your hand|you have in play)/.test(text) ||
    /trash (a|an|up to \d+|any number of) [a-z ]*from your hand/.test(text) ||
    /you may trash (a|an|up to \d+|any number of|it|them)/.test(above) ||
    /trash and\/or discard/.test(text) ||
    /trash a card from your hand/.test(text);
  if (trashesOwn) tags.add('trasher');

  const gains =
    /\bgain (a|an|two|2|\d+) [a-z ]*?(card|cards|action|treasure|silver|gold|copper|duchy|horse|horses)\b/.test(text) ||
    /\bgain a card costing/.test(text);
  if (gains && !/each other player gains? a curse\b/.test(text.replace(/gain a card costing/g, ''))) {
    tags.add('gainer');
  }
  if (/\bgain a card costing/.test(text)) tags.add('gainer');
  if (
    /trash a card from your hand\. gain a card costing up to/.test(text) ||
    /trash a card from your hand\. gain (a|2) cards? costing/.test(text)
  ) {
    tags.add('remodeler');
  }

  if (/discard any number of cards|discard \d+ cards?[^.]*\+\d+ cards?|then discard \d+ cards?|draw that many/.test(above)) {
    tags.add('sifter');
  }
  if (/(play|plays) [^.]*\b(twice|three times)\b/.test(text)) {
    // A Throne Room spends no extra Action of its own, so it isn't "terminal".
    tags.add('throne');
    tags.delete('terminal');
  }

  if (isAttack) {
    tags.add('attack');
    if (/gains? a curse|receives? (the next )?hex/.test(text) && /each other player|other players?/.test(text)) {
      if (/gains? a curse/.test(text)) tags.add('attackCurser');
    }
    if (/discards? down to|discards? \d+ cards?|discard (a|their) card/.test(text)) tags.add('attackHandsize');
    if (/gains? a (ruins|copper)|gains? (an? )?(ruins|copper)/.test(text)) tags.add('attackJunker');
    if (/trashes? |top of (his|their) deck|reveals? the top/.test(text)) tags.add('attackDeck');
  }
  if (/when another player plays an attack|unaffected by (attacks|that attack)/.test(text)) tags.add('defense');

  if (types.includes('Victory') || /<vp>/.test(text)) tags.add('altVP');
  if (/costs? \d+ coins? less|cost \d+ coins? less/.test(text)) tags.add('costReducer');
  if (/when you trash (this|it|a card)|when you trash/.test(text)) tags.add('trashBenefit');
  if (types.includes('Duration')) tags.add('duration');

  const complexTypes = ['Night', 'Reserve', 'Traveller', 'Fate', 'Doom', 'Liaison', 'Omen', 'Shadow', 'Gathering'];
  if (cost?.potion || (cost?.debt ?? 0) > 0 || /\bdebt\b|\bpotion\b/.test(text) || types.some((t) => complexTypes.includes(t))) {
    tags.add('complex');
  }

  return [...tags].sort();
}

/** Lowercases and flattens the dominiontabs markup into plain text. */
export function normalize(raw: string): string {
  return raw
    .replace(/<line>/gi, ' || ')
    .replace(/<\*?coin\*?>/gi, ' <coin> ')
    .replace(/<\*?vp\*?>/gi, ' <vp> ')
    .replace(/<(br|n|left|\/left|u|\/u|i|\/i|b|\/b|center|\/center|tab|h\d|\/h\d)>/gi, ' ')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function maxNumber(text: string, re: RegExp): number {
  let max = 0;
  for (const m of text.matchAll(re)) max = Math.max(max, Number(m[1]));
  return max;
}
