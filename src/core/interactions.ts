import type { Card, Mechanic, Synergy } from './types';

/**
 * Finds chains of cards whose mechanics feed each other.
 *
 * Each rule links a *producer* (e.g. "trashes an Action from your hand") to a
 * *reactor* (e.g. "when you trash this, put it into your hand"). Linked cards
 * are grouped into chains; a chain that can repeat within a turn is a loop.
 * Long chains, loops and chains that run through a landscape are what make a
 * kingdom memorable, so they score highest.
 */

export interface Link {
  from: Card;
  to: Card;
  text: string;
  weight: number;
  loop?: boolean;
  /** links that start a turn's sequence (e.g. +Buys enabling an Event) are explained first */
  first?: boolean;
}

export interface InteractionContext {
  /** Traits and the kingdom pile each one sits on */
  traits?: { trait: Card; target: Card }[];
}

const m = (c: Card, mech: Mechanic) => c.mechanics.includes(mech);
const isAction = (c: Card) => c.types.includes('Action');
const isEvent = (c: Card) => c.types.includes('Event');

/** Can `a` trash `b` from your hand? */
function trashes(a: Card, b: Card): boolean {
  return m(a, 'trashAny') || (m(a, 'trashAction') && isAction(b)) || (m(a, 'trashTreasure') && b.types.includes('Treasure'));
}
const trashesAnything = (c: Card) => m(c, 'trashAny') || m(c, 'trashAction') || m(c, 'trashTreasure') || m(c, 'trashSelf');
const producesSomething = (c: Card) =>
  trashesAnything(c) || m(c, 'gainLoot') || m(c, 'gainGold') || c.tags.includes('gainer') || c.tags.includes('draw');

type Rule = (a: Card, b: Card) => Omit<Link, 'from' | 'to'> | undefined;

const RULES: Rule[] = [
  // Trashing a card that rewards being trashed.
  (a, b) => {
    if (!trashes(a, b) || !m(b, 'onTrashSelf')) return undefined;
    if (m(b, 'returnsToHand')) {
      // It's a real loop when every trash pays out, or the trasher is a repeatable Event.
      const paysOut = isEvent(a) || m(a, 'gainLoot') || m(a, 'refund') || a.tags.includes('remodeler');
      return paysOut
        ? {
            text: `${a.name} trashes ${b.name} for profit, and ${b.name} comes straight back to your hand to do it again`,
            weight: 4,
            loop: true,
          }
        : { text: `${a.name} can trash ${b.name} at no cost: it comes straight back to your hand`, weight: 2 };
    }
    return { text: `${a.name} trashes ${b.name} to set off its when-trashed bonus`, weight: 2 };
  },
  // Any trash triggers a watcher.
  (a, b) =>
    trashesAnything(a) && m(b, 'onTrashAny') ? { text: `every card ${a.name} trashes also triggers ${b.name}`, weight: 3 } : undefined,
  // Gaining an expensive Treasure triggers a watcher.
  (a, b) => {
    if (!m(b, 'onGainTreasure5')) return undefined;
    if (m(a, 'gainLoot')) return { text: `each Loot from ${a.name} costs $7, so ${b.name} gains you another Loot`, weight: 3 };
    if (m(a, 'gainGold')) return { text: `the Gold from ${a.name} sets off ${b.name} for a Loot`, weight: 3 };
    return undefined;
  },
  (a, b) =>
    m(a, 'discards') && m(b, 'onDiscard') ? { text: `${a.name} discards ${b.name} to cash in its discard bonus`, weight: 3 } : undefined,
  // Self-inflicted junk that something can use.
  (a, b) => {
    if (!m(a, 'selfJunk') || !trashes(b, { ...a, types: ['Action', 'Ruins'] })) return undefined;
    if (m(b, 'typeCount'))
      return { text: `${a.name} brings Ruins, which are Action–Ruins: ${b.name} trashes each one for +4 Cards`, weight: 4 };
    return { text: `${b.name} trashes the Ruins that ${a.name} brings`, weight: 2 };
  },
  // The trash becomes a resource.
  (a, b) =>
    trashesAnything(a) && m(b, 'fromTrash')
      ? { text: `whatever ${a.name} trashes is up for grabs: ${b.name} lets players take it back out of the trash`, weight: 2 }
      : undefined,
  // A card that multiplies itself, cashed in at full price.
  (a, b) =>
    m(a, 'selfReplicate') && m(b, 'refund') && trashes(b, a)
      ? {
          text: `${a.name} keeps making more of itself; ${b.name} trashes the copies for their full $${a.cost.coins}`,
          weight: 4,
          loop: true,
        }
      : undefined,
  // +Buy turns a one-shot Event into a repeatable one.
  (a, b) =>
    isEvent(b) && producesSomething(b) && a.tags.includes('plusBuy') && a.kind !== 'landscape'
      ? {
          text: `${a.name}'s +Buy${m(a, 'manyBuys') ? 's let' : ' lets'} you use ${b.name} more than once a turn`,
          weight: m(a, 'manyBuys') ? 3 : 2,
          loop: true,
          first: true,
        }
      : undefined,
  (a, b) =>
    m(a, 'gainAttack') && b.tags.includes('attack') && b.kind === 'kingdom'
      ? { text: `trashing ${a.name} gains you a ${b.name}`, weight: 1 }
      : undefined,
  // Attack-proof cards.
  (a, b) =>
    a.tags.includes('attackDeck') && m(b, 'onTrashSelf') && b.kind === 'kingdom'
      ? {
          text: `${b.name} shrugs off ${a.name}: when it is trashed it ${m(b, 'returnsToHand') ? 'comes back to your hand' : 'still pays out'}`,
          weight: 2,
        }
      : undefined,
  (a, b) =>
    a.tags.includes('attackHandsize') && m(b, 'drawToX')
      ? { text: `${b.name} refills the hand that ${a.name} cuts down`, weight: 2 }
      : undefined,
  // Treasure decks.
  (a, b) => {
    if (!m(b, 'treasurePayoff')) return undefined;
    if (m(a, 'gainTreasure')) return { text: `${a.name} fills your deck with Treasures, which ${b.name} rewards`, weight: 2 };
    if (a.kind === 'kingdom' && a.types.includes('Treasure'))
      return { text: `${b.name} gets more out of Treasures like ${a.name}`, weight: 2 };
    return undefined;
  },
  // Collecting differently named cards.
  (a, b) =>
    m(b, 'varietyPayoff') &&
    a.kind === 'kingdom' &&
    ((a.tags.includes('gainer') && !a.tags.includes('attack')) || a.tags.includes('plusBuy'))
      ? { text: `${a.name} helps you collect lots of differently named cards for ${b.name}`, weight: 2 }
      : undefined,
  // Playing lots of Actions in one turn.
  (a, b) =>
    m(b, 'actionCount') && isAction(a) && a.kind === 'kingdom' && !a.tags.includes('terminal') && a.cost.coins <= 4
      ? { text: `${a.name} is a cheap extra Action that powers ${b.name}`, weight: 1 }
      : undefined,
  (a, b) =>
    m(a, 'coffers') && m(b, 'overpay') ? { text: `Coffers from ${a.name} let you overpay big for ${b.name}`, weight: 3 } : undefined,
  (a, b) =>
    a.types.includes('Duration') && m(b, 'extraTurn')
      ? { text: `${b.name}'s extra turn cashes in ${a.name}'s next-turn bonus straight away`, weight: 2 }
      : undefined,
  (a, b) =>
    m(a, 'topdeckSelf') && m(b, 'extraTurn')
      ? { text: `${a.name} puts itself back on top of your deck, so ${b.name}'s extra turn draws it again`, weight: 3, loop: true }
      : undefined,
  (a, b) =>
    m(a, 'reveals') && m(b, 'onReveal')
      ? { text: `${a.name} reveals cards, and each ${b.name} it reveals pays out Coffers`, weight: 2 }
      : undefined,
  (a, b) => {
    if (!(m(a, 'typeBonus') || m(a, 'typeCount')) || b.kind !== 'kingdom') return undefined;
    const types = b.types.filter((t) => ['Action', 'Treasure', 'Victory', 'Night'].includes(t));
    return types.length >= 2 ? { text: `${a.name} pays out for each of ${b.name}'s types (${types.join('–')})`, weight: 2 } : undefined;
  },
  (a, b) =>
    m(a, 'victoryRemodel') && b.kind === 'kingdom' && b.types.includes('Victory')
      ? { text: `${a.name} climbs the Victory ladder, turning ${b.name} into something bigger`, weight: 2 }
      : undefined,
  (a, b) =>
    a.kind === 'kingdom' && a.types.includes('Duration') && m(b, 'durationPayoff')
      ? { text: `${b.name} rewards Duration cards like ${a.name}`, weight: 2 }
      : undefined,
  (a, b) =>
    m(b, 'onGainAction') && a.kind === 'kingdom' && a.tags.includes('gainer') && !a.tags.includes('attack')
      ? { text: `every Action ${a.name} gains also triggers ${b.name}`, weight: 2 }
      : undefined,
  (a, b) =>
    a.tags.includes('costReducer') && b.kind === 'kingdom' && b.cost.coins >= 6
      ? { text: `${a.name} brings ${b.name} within reach`, weight: 1 }
      : undefined,
  (a, b) =>
    m(a, 'topdeckSetup') && m(b, 'nameCard')
      ? { text: `${a.name} sets up the top of your deck so ${b.name} names the right card`, weight: 2 }
      : undefined,
  // Starting cards (Shelters) worth trashing for profit.
  (a, b) =>
    b.kind === 'shelter' && isAction(b) && trashes(a, b) && (m(a, 'gainLoot') || m(a, 'refund') || a.tags.includes('remodeler'))
      ? {
          text: `${a.name} turns your starting ${b.name} into ${m(a, 'gainLoot') ? 'a $7 Loot' : 'something better'} on the first shuffle`,
          weight: 3,
        }
      : undefined,
];

/** All producer→reactor links among the given cards. */
export function findLinks(cards: readonly Card[], ctx: InteractionContext = {}): Link[] {
  const links: Link[] = [];
  for (const a of cards) {
    for (const b of cards) {
      if (a === b) continue;
      for (const rule of RULES) {
        const hit = rule(a, b);
        if (hit) links.push({ from: a, to: b, ...hit });
      }
    }
  }
  // +Buy only matters for an Event that sets something else off; on its own
  // "you can buy an Event twice" is not a combo.
  const feedsSomething = (c: Card) => links.some((l) => l.from === c && !l.first);
  const meaningful = links.filter((l) => !(l.first && isEvent(l.to)) || feedsSomething(l.to));
  links.length = 0;
  links.push(...capPerCard(meaningful));

  for (const { trait, target } of ctx.traits ?? []) {
    if (!m(trait, 'startsInDeck')) continue;
    const engaged = links.some((l) => l.from === target || l.to === target);
    links.push({
      from: trait,
      to: target,
      text: `${trait.name}: you start the game with a ${target.name}`,
      weight: engaged ? 3 : 1,
      first: true,
    });
  }
  return links;
}

/** Upper bound on one chain's weight. */
const MAX_CHAIN_WEIGHT = 30;

/** Cards named in a chain's title; the rest appear in its steps. */
const MAX_TITLE_CARDS = 5;

/** Most links a card may produce, and receive, so multi-purpose cards don't dominate every board. */
const MAX_LINKS_FROM = 4;
const MAX_LINKS_TO = 3;

/** Keeps each card's strongest links. Enabling links (+Buys, starting cards) are always kept. */
function capPerCard(links: Link[]): Link[] {
  const from = new Map<Card, number>();
  const to = new Map<Card, number>();
  const out: Link[] = [];
  for (const l of [...links].sort((a, b) => b.weight - a.weight)) {
    if (!l.first) {
      if ((from.get(l.from) ?? 0) >= MAX_LINKS_FROM || (to.get(l.to) ?? 0) >= MAX_LINKS_TO) continue;
      from.set(l.from, (from.get(l.from) ?? 0) + 1);
      to.set(l.to, (to.get(l.to) ?? 0) + 1);
    }
    out.push(l);
  }
  return out;
}

/**
 * Groups links into connected chains and turns each into a Synergy with
 * step-by-step explanations.
 */
export function findChains(cards: readonly Card[], ctx: InteractionContext = {}): Synergy[] {
  const links = findLinks(cards, ctx);
  const parent = new Map<Card, Card>();
  const find = (c: Card): Card => {
    const p = parent.get(c) ?? c;
    if (p === c) return c;
    const root = find(p);
    parent.set(c, root);
    return root;
  };
  for (const l of links) parent.set(find(l.from), find(l.to));

  const groups = new Map<Card, Link[]>();
  for (const l of links) {
    const root = find(l.from);
    groups.set(root, [...(groups.get(root) ?? []), l]);
  }

  return [...groups.values()].map((group) => {
    const ordered = orderLinks(group);
    const members = [...new Set(ordered.flatMap((l) => [l.from, l.to]))];
    // Name the chain after its most involved cards; big chains list the rest in the steps.
    const involvement = new Map<Card, number>();
    for (const l of group) for (const c of [l.from, l.to]) involvement.set(c, (involvement.get(c) ?? 0) + l.weight);
    const top = new Set(
      [...involvement.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, MAX_TITLE_CARDS)
        .map(([c]) => c),
    );
    const headline = members.filter((c) => top.has(c));
    const loop = group.some((l) => l.loop);
    const base = group.reduce((s, l) => s + l.weight, 0);
    // Playtests showed huge chains are rarely proportionally better: a loop is
    // still paced by the coins and Buys it costs. Throttle and cap.
    const weight = Math.min(base * (1 + 0.15 * (members.length - 2)) * (loop ? 1.25 : 1), MAX_CHAIN_WEIGHT);
    return {
      kind: 'chain' as const,
      cards: members.map((c) => c.id),
      reason:
        ordered.length === 1
          ? capitalize(ordered[0]!.text)
          : headline.map((c) => c.name).join(' + ') +
            (members.length > headline.length ? ` and ${members.length - headline.length} more` : ''),
      steps: ordered.length === 1 ? undefined : ordered.map((l) => capitalize(l.text)),
      loop: loop || undefined,
      weight: Math.round(weight * 10) / 10,
    };
  });
}

/**
 * Orders links so a chain reads roughly in play order: set-up links (+Buys,
 * starting cards) first, then from cards nothing feeds, following each card
 * to what it sets off.
 */
function orderLinks(links: Link[]): Link[] {
  const indegree = new Map<Card, number>();
  for (const l of links) indegree.set(l.to, (indegree.get(l.to) ?? 0) + 1);
  const rank = (l: Link) => (l.first ? 0 : 100) + (indegree.get(l.from) ?? 0) * 10 - l.weight;
  const sorted = [...links].sort((a, b) => rank(a) - rank(b));
  const out: Link[] = [];
  const seen = new Set<Link>();
  const visit = (card: Card) => {
    for (const l of sorted) {
      if (l.from !== card || seen.has(l)) continue;
      seen.add(l);
      out.push(l);
      visit(l.to);
    }
  };
  for (const l of sorted) {
    if (seen.has(l)) continue;
    seen.add(l);
    out.push(l);
    visit(l.to);
  }
  return out;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
