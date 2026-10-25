import { cardsInProducts, database, getCard, productFamily } from './cards';
import { createRng, randomSeed, type Rng } from './rng';
import { generateRequestSchema, type GenerateRequestInput } from './schema';
import { scoreKingdom } from './scoring';
import { buildSetup, type SetupResult } from './setup';
import { findSynergies } from './synergy';
import type { Card, Kingdom, ScoreBreakdown, Synergy } from './types';

export const KINGDOM_SIZE = 10;
/** How many random candidate kingdoms are scored before one is chosen. */
const CANDIDATES = 300;
/** The final pick is made among this many of the best candidates, so rerolls vary. */
const SHORTLIST = 15;
const MAX_ATTACKS_FOR_SOME = 2;

export class GenerationError extends Error {
  override name = 'GenerationError';
}

interface Candidate {
  cards: Card[];
  landscapes: Card[];
  setup: SetupResult;
  synergies: Synergy[];
  score: ScoreBreakdown;
}

const SHELTERS = database.cards.filter((c) => c.kind === 'shelter');

/**
 * Generates a fun kingdom. Pure and deterministic: the same request (with
 * the same seed) always yields the same kingdom, so a share link only needs
 * to carry the seed and settings.
 */
export function generateKingdom(input: GenerateRequestInput): Kingdom {
  const parsed = generateRequestSchema.safeParse(input);
  if (!parsed.success) throw new GenerationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const req = parsed.data;
  const seed = req.seed ?? randomSeed();
  const rng = createRng(seed);

  const banned = new Set(req.banned);
  const lockedCards = [...new Set(req.locked)].map((id) => getCard(id)!);
  const lockedKingdom = lockedCards.filter((c) => c.kind === 'kingdom');
  const lockedLandscapes = lockedCards.filter((c) => c.kind === 'landscape');
  if (lockedKingdom.length > KINGDOM_SIZE) throw new GenerationError(`at most ${KINGDOM_SIZE} kingdom cards can be locked`);
  const lockedIds = new Set(lockedCards.map((c) => c.id));

  const owned = cardsInProducts(req.products);
  // "Surprise me" always allows complex cards and wants at least two landscapes.
  const allowComplex = req.allowComplex || req.surprise;
  const allowed = (c: Card) => !banned.has(c.id) && !lockedIds.has(c.id) && (allowComplex || !c.tags.includes('complex'));
  const kingdomPool = owned.filter((c) => c.kind === 'kingdom' && allowed(c) && (req.attacks !== 'none' || !c.tags.includes('attack')));
  const landscapePool = owned.filter((c) => c.kind === 'landscape' && allowed(c));
  const landscapeCount = Math.max(req.surprise ? Math.max(req.landscapes, 2) : req.landscapes, lockedLandscapes.length);
  const allies = owned.filter((c) => c.kind === 'ally' && !banned.has(c.id));
  const prophecies = owned.filter((c) => c.kind === 'prophecy' && !banned.has(c.id));

  const candidates: Candidate[] = [];
  for (let i = 0; i < CANDIDATES; i++) {
    const pool = restrictFamilies(kingdomPool, lockedKingdom, req.maxProducts, rng);
    const cards = drawKingdom(pool, lockedKingdom, req.attacks, rng);
    if (!cards) continue;
    const families = new Set(cards.flatMap((c) => c.products.map(productFamily)));
    const landscapes = [
      ...lockedLandscapes,
      ...rng
        .shuffle(landscapePool.filter((l) => req.maxProducts === 0 || l.products.some((p) => families.has(productFamily(p)))))
        .slice(0, landscapeCount - lockedLandscapes.length),
    ];
    // Setup is decided per candidate because it changes how cards interact:
    // Shelters put Necropolis in every deck, Traits sit on specific piles.
    const used = new Set([...cards, ...landscapes]);
    const setup = buildSetup(
      { kingdom: cards, landscapes, unusedKingdom: kingdomPool.filter((c) => !used.has(c)), allies, prophecies },
      rng,
    );
    const synergies = findSynergies([...cards, ...landscapes, ...setup.extras, ...(setup.shelters ? SHELTERS : [])], {
      traits: setup.traits,
    });
    const score = scoreKingdom(cards, landscapes, synergies, { surprise: req.surprise });
    candidates.push({ cards, landscapes, setup, synergies, score });
  }
  if (candidates.length === 0) {
    throw new GenerationError('Not enough cards match your settings to build a kingdom — select more sets or relax the filters.');
  }

  const chosen = pickFromShortlist(candidates, rng);
  const { setup } = chosen;

  return {
    seed,
    cards: [...chosen.cards].sort(byCostThenName),
    landscapes: [...chosen.landscapes].sort(byCostThenName),
    extras: setup.extras,
    setup: setup.notes,
    synergies: [...chosen.synergies].sort((a, b) => b.weight - a.weight),
    score: chosen.score,
  };
}

function restrictFamilies(pool: Card[], locked: Card[], maxProducts: number, rng: Rng): Card[] {
  if (maxProducts === 0) return pool;
  const families = [...new Set(pool.flatMap((c) => c.products.map(productFamily)))];
  const required = new Set(locked.flatMap((c) => c.products.slice(0, 1).map(productFamily)));
  const chosen = new Set(required);
  for (const f of rng.shuffle(families)) {
    if (chosen.size >= Math.max(maxProducts, required.size)) break;
    chosen.add(f);
  }
  return pool.filter((c) => c.products.some((p) => chosen.has(productFamily(p))));
}

function drawKingdom(pool: Card[], locked: Card[], attacks: 'none' | 'some' | 'any', rng: Rng): Card[] | undefined {
  const cards = [...locked];
  let attackCount = cards.filter((c) => c.tags.includes('attack')).length;
  for (const card of rng.shuffle(pool)) {
    if (cards.length >= KINGDOM_SIZE) break;
    const isAttack = card.tags.includes('attack');
    if (attacks === 'some' && isAttack && attackCount >= MAX_ATTACKS_FOR_SOME) continue;
    cards.push(card);
    if (isAttack) attackCount++;
  }
  return cards.length === KINGDOM_SIZE ? cards : undefined;
}

/** Weighted pick among the top candidates: better kingdoms are likelier but rerolls still vary. */
function pickFromShortlist(candidates: Candidate[], rng: Rng): Candidate {
  const top = [...candidates].sort((a, b) => b.score.total - a.score.total).slice(0, SHORTLIST);
  const weights = top.map((_, i) => SHORTLIST - i);
  let roll = rng.next() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < top.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return top[i]!;
  }
  return top[0]!;
}

function byCostThenName(a: Card, b: Card): number {
  return a.cost.coins - b.cost.coins || a.name.localeCompare(b.name);
}
