import type { Card, ScoreBreakdown, Synergy, Tag } from './types';

/** Roles that make a board interesting; more of them means more decisions. */
const ROLES: Tag[] = ['village', 'draw', 'trasher', 'gainer', 'plusBuy', 'economy', 'attack', 'sifter', 'throne', 'duration'];

/** Card types and mechanics that bend the usual rules — what "Surprise me" looks for. */
const UNUSUAL_TYPES = [
  'Night',
  'Reserve',
  'Traveller',
  'Way',
  'Trait',
  'Project',
  'Event',
  'Landmark',
  'Command',
  'Liaison',
  'Omen',
  'Shadow',
  'Fate',
  'Doom',
  'Gathering',
];

/** Points for the number of viable strategies: two is good, more is better. */
const STRATEGY_POINTS = [-8, 0, 10, 16, 20, 23, 25, 26, 27];

const count = (cards: readonly Card[], pred: (c: Card) => boolean) => cards.filter(pred).length;

/**
 * Themes the designers build recommended kingdoms around noticeably more
 * often than random boards do (measured by scripts/analyze-recommended.ts).
 */
const THEMES: { label: string; matches: (c: Card) => boolean }[] = [
  { label: 'Overpay', matches: (c) => c.mechanics.includes('overpay') },
  { label: 'Coffers', matches: (c) => c.mechanics.includes('coffers') },
  { label: 'Variety', matches: (c) => c.mechanics.includes('varietyPayoff') },
  { label: 'Trash rewards', matches: (c) => c.mechanics.includes('onTrashSelf') || c.mechanics.includes('onTrashAny') },
  { label: 'Victory cards', matches: (c) => c.kind === 'kingdom' && c.types.includes('Victory') },
  { label: 'Reserve', matches: (c) => c.types.includes('Reserve') },
];
const has = (c: Card, t: Tag) => c.tags.includes(t);
const isPureVictory = (c: Card) => c.types.includes('Victory') && !c.types.includes('Action') && !c.types.includes('Treasure');

export interface ScoreOptions {
  /** favour rule-bending landscapes, unusual card types and chains through landscapes */
  surprise?: boolean;
}

/**
 * Which broad strategies look viable on this board. A kingdom where several
 * compete gives players real choices.
 */
export function viableStrategies(kingdom: readonly Card[], landscapes: readonly Card[], synergies: readonly Synergy[]): string[] {
  const all = [...kingdom, ...landscapes];
  const out: string[] = [];
  const any = (cards: readonly Card[], pred: (c: Card) => boolean) => cards.some(pred);

  if (
    any(kingdom, (c) => (has(c, 'draw') && has(c, 'terminal') && c.cost.coins >= 4) || (c.types.includes('Treasure') && c.cost.coins >= 5))
  ) {
    out.push('Big Money');
  }
  if (any(all, (c) => has(c, 'village')) && any(all, (c) => has(c, 'draw')) && any(all, (c) => has(c, 'plusBuy') || has(c, 'gainer'))) {
    out.push('Engine');
  }
  if (synergies.some((s) => s.kind === 'chain' && (s.loop || s.weight >= 15))) out.push('Combo');
  // Alt-VP needs a way to pile up Victory cards: a gainer that isn't also an attack, plus +Buy.
  if (any(kingdom, isPureVictory) && any(all, (c) => has(c, 'gainer') && !has(c, 'attack')) && any(all, (c) => has(c, 'plusBuy'))) {
    out.push('Alt-VP');
  }
  // Strong, cheap trashing (Chapel-like) plus something worth thinning down to.
  const cheapTrasher = any(all, (c) => c.mechanics.includes('trashAny') && c.cost.coins <= 3 && !c.cost.potion && !has(c, 'attack'));
  const payload = any(kingdom, (c) => has(c, 'economy') && c.cost.coins >= 5 && (c.types.includes('Treasure') || has(c, 'plusBuy')));
  if (cheapTrasher && payload) out.push('Trash & payload');
  const mech = (c: Card, mechanic: Card['mechanics'][number]) => c.mechanics.includes(mechanic);
  const treasures = kingdom.filter((c) => c.types.includes('Treasure')).length;
  if (any(all, (c) => mech(c, 'treasurePayoff')) && (any(all, (c) => mech(c, 'gainTreasure')) || treasures >= 2)) out.push('Treasure');
  if (any(all, (c) => mech(c, 'varietyPayoff')) && any(all, (c) => has(c, 'gainer') || has(c, 'plusBuy'))) out.push('Variety');
  // Bank Coffers now, splurge on something expensive (or overpay) later.
  if (count(all, (c) => mech(c, 'coffers')) >= 2 && any(kingdom, (c) => c.cost.coins >= 6 || mech(c, 'overpay'))) out.push('Coffers');
  if (any(kingdom, (c) => has(c, 'attackCurser') || has(c, 'attackJunker')) && any(all, (c) => has(c, 'gainer')) && !cheapTrasher) {
    out.push('Slog');
  }
  return out;
}

/**
 * Scores how fun a kingdom is likely to be:
 *  - chains of cards (and landscapes) that feed each other, especially loops;
 *  - several viable strategies competing on the same board;
 *  - interaction, variety and a sensible cost curve;
 *  - minus known un-fun patterns (stacked cursers, nothing to do but buy money).
 */
export function scoreKingdom(
  kingdom: readonly Card[],
  landscapes: readonly Card[],
  synergies: readonly Synergy[],
  options: ScoreOptions = {},
): ScoreBreakdown {
  const all = [...kingdom, ...landscapes];
  const parts: { label: string; value: number }[] = [];
  const add = (label: string, value: number) => {
    if (value !== 0) parts.push({ label, value: Math.round(value * 10) / 10 });
  };

  const villages = count(all, (c) => has(c, 'village'));
  const draw = count(all, (c) => has(c, 'draw'));
  const terminalDraw = count(kingdom, (c) => has(c, 'draw') && has(c, 'terminal'));
  const trashers = count(all, (c) => has(c, 'trasher'));
  const gainers = count(all, (c) => has(c, 'gainer'));
  const attacks = count(kingdom, (c) => has(c, 'attack'));
  const cursers = count(kingdom, (c) => has(c, 'attackCurser'));
  const defenses = count(all, (c) => has(c, 'defense'));
  const pureVictory = count(kingdom, isPureVictory);

  // Synergies, with diminishing returns so one huge chain can't carry a dull board.
  const synergyTotal = synergies.reduce((s, x) => s + x.weight, 0);
  add('Synergies', 35 * (1 - Math.exp(-synergyTotal / 20)));
  const landscapeIds = new Set(landscapes.map((l) => l.id));
  const landscapeChains = synergies.filter((s) => s.kind === 'chain' && s.cards.some((id) => landscapeIds.has(id))).length;
  add('Landscape twists', Math.min(landscapeChains, 2) * (options.surprise ? 8 : 3));

  const strategies = viableStrategies(kingdom, landscapes, synergies);
  add(`${strategies.length} viable strateg${strategies.length === 1 ? 'y' : 'ies'}`, STRATEGY_POINTS[Math.min(strategies.length, 6)]!);

  const themes = THEMES.filter((t) => count(all, t.matches) >= (t.label === 'Overpay' ? 2 : 3));
  add(themes.length ? `Theme: ${themes.map((t) => t.label).join(', ')}` : 'Theme', Math.min(themes.length, 2) * 4);

  const roles = ROLES.filter((r) => all.some((c) => has(c, r))).length;
  add('Variety of roles', roles * 1.5);

  // The designers' recommended kingdoms (scripts/analyze-recommended.ts) have
  // a wider cost curve than random boards: a $2, a $6+ and five or more costs.
  const costs = new Set(kingdom.map((c) => Math.min(c.cost.coins, 6)));
  add('Cost spread', costs.size * 2);
  if (kingdom.some((c) => c.cost.coins <= 2 && !c.cost.potion && !c.cost.debt)) add('A $2 opener', 3);
  if (!kingdom.some((c) => c.cost.coins <= 3)) add('No cheap openers', -5);
  if (!kingdom.some((c) => c.cost.coins >= 5)) add('No expensive cards', -5);

  // Interaction: one attack is welcome; the designers rarely use three or more.
  const sharedTrash = kingdom.some((c) => c.mechanics.includes('fromTrash'));
  if (attacks > 0 || sharedTrash) add('Player interaction', 5);
  if (cursers >= 2) add('Stacked cursers', -6);
  else if (cursers === 1 && trashers === 0 && defenses === 0) add('Curses with no way to clean up', -6);
  if (attacks >= 3) add('Too many attacks', -8);
  else if (attacks === 2) add('Two attacks', -2);

  // Lopsided boards.
  if (pureVictory >= 2) add('Several Victory piles', -3);
  if (villages >= 3 && draw === 0) add('Villages with nothing to draw', -6);
  if (terminalDraw >= 3 && villages === 0) add('Terminal draw with no villages', -4);
  if (villages > 0) add('Villages available', 5);
  const terminals = count(kingdom, (c) => has(c, 'terminal'));
  if (terminals >= 6 && villages < 2) add('Too many terminals', -5);
  if (villages === 0 && trashers === 0 && gainers === 0) add('Little to do but buy money', -8);

  // The designers' recommended kingdoms showcase each set's new mechanics, so a
  // little of that counts as fun; "Surprise me" leans into it.
  const unusual = new Set(all.flatMap((c) => c.types.filter((t) => UNUSUAL_TYPES.includes(t))));
  if (options.surprise) add('Unusual mechanics', Math.min(unusual.size * 2, 12));
  else add('Distinctive mechanics', Math.min(unusual.size, 3) * 1.5);

  const total = Math.round(parts.reduce((s, p) => s + p.value, 0));
  return { total, parts, archetypes: strategies.length ? strategies : ['Money'] };
}
