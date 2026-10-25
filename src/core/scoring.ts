import type { Card, ScoreBreakdown, Synergy, Tag } from './types';

/**
 * Roles that make a board interesting. A kingdom that offers many of them
 * supports several strategies, which is the main ingredient of a "fun" game.
 */
const ROLES: Tag[] = ['village', 'draw', 'trasher', 'gainer', 'plusBuy', 'economy', 'attack', 'sifter', 'throne', 'duration'];

const count = (cards: readonly Card[], pred: (c: Card) => boolean) => cards.filter(pred).length;
const has = (c: Card, t: Tag) => c.tags.includes(t);

/**
 * Scores how fun a kingdom is likely to be. The heuristics follow common
 * advice from the Dominion strategy community:
 *  - strategic depth: an engine (villages + draw) is possible, with support
 *    (trashing, +Buy) — but money and alt-VP strategies also compete;
 *  - interaction: some attacks, ideally with counterplay;
 *  - variety: many different roles and a spread of costs;
 *  - and the absence of known "un-fun" patterns (stacked cursers, boards
 *    where nothing combos so the game is pure Big Money).
 */
export function scoreKingdom(kingdom: readonly Card[], landscapes: readonly Card[], synergies: readonly Synergy[]): ScoreBreakdown {
  const all = [...kingdom, ...landscapes];
  const parts: { label: string; value: number }[] = [];
  const archetypes: string[] = [];
  const add = (label: string, value: number) => {
    if (value !== 0) parts.push({ label, value: Math.round(value * 10) / 10 });
  };

  const villages = count(all, (c) => has(c, 'village'));
  const draw = count(all, (c) => has(c, 'draw'));
  const terminalDraw = count(kingdom, (c) => has(c, 'draw') && has(c, 'terminal'));
  const trashers = count(all, (c) => has(c, 'trasher'));
  const buys = count(all, (c) => has(c, 'plusBuy'));
  const gainers = count(all, (c) => has(c, 'gainer'));
  const attacks = count(kingdom, (c) => has(c, 'attack'));
  const cursers = count(kingdom, (c) => has(c, 'attackCurser'));
  const defenses = count(all, (c) => has(c, 'defense'));
  const altVP = count(kingdom, (c) => c.types.includes('Victory') && !c.types.includes('Action') && !c.types.includes('Treasure'));

  // Synergy: diminishing returns so one combo-heavy pair can't dominate.
  const synergyTotal = synergies.reduce((s, x) => s + x.weight, 0);
  add('Synergies', 30 * (1 - Math.exp(-synergyTotal / 12)));

  // Strategic depth.
  const engine = villages > 0 && draw > 0;
  if (engine) {
    archetypes.push('Engine');
    add('Engine possible', 10);
    if (trashers > 0) add('Engine has trashing', 4);
    if (buys > 0) add('Engine has +Buy', 3);
  }
  if (altVP >= 2) add('Several Victory piles', -3);
  if (altVP > 0 && (gainers > 0 || buys > 0)) {
    archetypes.push('Alt-VP');
    add('Alternative VP plan', 2);
  }
  if (gainers >= 2) archetypes.push('Gainers');
  if (trashers > 0 && !engine) archetypes.push('Slog / Money with trashing');

  const roles = ROLES.filter((r) => all.some((c) => has(c, r))).length;
  add('Variety of roles', roles * 2);

  const costs = new Set(kingdom.map((c) => Math.min(c.cost.coins, 6)));
  add('Cost spread', costs.size * 1.5);
  if (!kingdom.some((c) => c.cost.coins <= 3)) add('No cheap openers', -5);
  if (!kingdom.some((c) => c.cost.coins >= 5)) add('No expensive cards', -5);

  // Interaction.
  if (attacks > 0) add('Player interaction', defenses > 0 || trashers > 0 ? 8 : 5);
  if (cursers >= 2) add('Stacked cursers', -10);
  else if (cursers === 1 && trashers === 0 && defenses === 0) add('Curses with no way to clean up', -6);
  if (attacks >= 4) add('Too many attacks', -6);

  // Lopsided boards.
  if (villages >= 3 && draw === 0) add('Villages with nothing to draw', -6);
  if (terminalDraw >= 3 && villages === 0) add('Terminal draw with no villages', -4);
  if (villages === 0 && trashers === 0 && gainers === 0) {
    archetypes.push('Big Money');
    add('Little to do but buy money', -8);
  }

  const total = Math.round(parts.reduce((s, p) => s + p.value, 0));
  return { total, parts, archetypes: archetypes.length ? archetypes : ['Money'] };
}
