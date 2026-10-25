# Dominion Pick

Picks a **fun** [Dominion](https://wiki.dominionstrategy.com/) kingdom from the sets you own: a static web app that runs in any browser and installs on Android as an app (PWA). There's no server: everything runs on your device.

**Live site:** https://sarahgraceparr.github.io/dominion_pick/

- Choose the sets (and editions) you own, the number of landscapes (Events, Projects, Ways, Landmarks, Traits), how many attacks you want, whether complex mechanics (Potions, Debt, Night…) are welcome, and how many sets to mix.
- **Lock** cards you like and pick again, or **swap** a single card.
- See _why_ the kingdom should be fun: detected synergies, possible strategies, and a score breakdown.
- Official setup is handled for you: Bane (Young Witch), Colony/Platinum, Shelters, Potion, Ruins, Boons/Hexes, Allies for Liaisons, Prophecies for Omens, Ferryman/Riverboat/Way of the Mouse set-asides, and more.
- **Share** a link that reproduces the exact kingdom. Kingdoms are generated from a seed, so the link carries everything needed.
- Works **offline** once it has been opened.

## Install on Android

Open the site in Chrome, then use **⋮ → Add to Home screen / Install app**. It opens full-screen like a native app and keeps working offline. (If you'd prefer a Play Store package, the same build can be wrapped as a Trusted Web Activity with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). No code changes are needed.)

## How "fun" is decided

Three things make a kingdom fun:

1. **Chains of cards that feed each other**, especially ones that repeat within a turn.
2. **Several viable strategies on the same board**. Two balanced options are good; more are better.
3. **Unexpected consequences**, often from landscapes (Events, Traits, Projects, Ways…) or the setup itself.

### Card mechanics and chains

At build time, each card's full text is parsed into two kinds of information (`scripts/lib/derive-tags.ts`, with hand corrections in `scripts/tag-overrides.ts`):

- **Roles**: village, draw, trashing, gaining, +Buy, attacks and so on.
- **Mechanics** (`MECHANICS` in `src/core/types.ts`): what a card _produces_ (trashes an Action, gains a Loot, makes copies of itself, pays out by cost…) and what it _reacts to_ (when trashed, when any card is trashed, when a $5+ Treasure is gained, when discarded…).

`src/core/interactions.ts` links producers to reactors and groups the links into **chains**, explained step by step in the app. A chain that can repeat within a turn is a **loop**. Longer chains, loops and chains that run through a landscape score highest. The setup is part of the picture: Shelters put Necropolis in every deck, and Traits are placed on a specific pile (Inherited on Rats means everyone starts with a Rats).

The examples that shaped the model are tests in `src/core/fun.test.ts`:

- **Peril + Fortress + Market Square + Squire + Cutthroat.** Squire's +Buys let you use Peril repeatedly. Fortress comes back every time it's trashed, Market Square turns each trash into a Gold, and Cutthroat turns the Loots and Golds into more Loots.
- **Maroon + Death Cart.** Ruins are Action–Ruins, so each one Maroon trashes draws 4 cards.
- **Rats + Crucible + Inherited (Rats).** Rats keep copying themselves, and Crucible cashes them in for $4 without using an Action.
- **Peril + Shelters.** Necropolis becomes a $7 Loot on the first shuffle.
- **Rogue / Shaman with trashers.** The trash becomes a shared resource, which is interaction in itself.

On top of the chains there are generic role pairings (villages with terminal draw, Throne Room with strong terminals, +Buy with cost reducers…) and a curated list of well-known combos (`src/core/combos.ts`).

### Scoring

The generator draws 300 random kingdoms that fit your settings, decides each one's setup, scores it, and picks among the best 15. Better kingdoms are more likely, but rerolls stay varied. The score (`src/core/scoring.ts`) adds up:

- **Synergies.** Chains, combos and role pairings, with diminishing returns. There's a bonus for chains through landscapes.
- **Viable strategies.** Big Money, Engine, Combo, Alt-VP, Trash & payload, and Slog are each checked separately. One strategy earns nothing, two earn +10, and more earn up to +25.
- **Variety, cost spread and interaction.**
- **Penalties** for known un-fun patterns: stacked cursers, curses with no way to clean them up, villages with nothing to draw, terminal draw with no villages, and boards with nothing to do but buy money.

To stop multi-purpose cards (Squire, Fortress, Wizards…) from appearing in every kingdom, each card's number of links is capped.

### Surprise me

**✨ Surprise me** uses at least two landscapes, allows complex mechanics, doubles the bonus for chains that run through landscapes, and rewards unusual card types (Night, Reserve, Traits, Ways, Projects, Omens…).

## Architecture

```
src/core     pure TypeScript domain logic
             (card data, classification, synergy, scoring, setup rules, seeded RNG, request schema)
src/web      React PWA (mobile-first, light/dark, offline)
scripts      build-time card data pipeline
tests/e2e    Playwright tests (desktop Chrome + Pixel 7 emulation)
```

The app is a set of static files. Kingdoms are generated in the browser, settings live in `localStorage`, and share links carry the seed and settings, so there is nothing to run or store on a server.

## Development

Requires Node 22+.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run check`      | lint + format check + typecheck + unit/component tests with coverage   |
| `npm test`           | unit + component tests (Vitest)                                        |
| `npm run test:e2e`   | builds the site, serves it under `/dominion_pick/` and runs Playwright |
| `npm run build`      | production build into `dist/` (set `BASE_PATH` for a sub-path)         |
| `npm run preview`    | serves the production build locally                                    |
| `npm run build:data` | regenerates `src/core/data/cards.json` from the pinned upstream data   |

### Testing pyramid

1. **Unit** (most tests, fast): classifier, RNG, synergy rules, scoring, setup rules, generator invariants (determinism, filters, locks/bans), input validation, settings/URL handling. `src/core/**`, `scripts/**`, and `src/web/*.test.ts`.
2. **Component**: React components and the whole app with Testing Library (first visit, share links, lock/swap, settings persistence, errors, sharing).
3. **End-to-end** (few): the production build in a real browser on desktop and an emulated Android phone, served from the same sub-path as GitHub Pages. Covers pick, share-link reproduction, lock/swap, settings, offline use, the manifest and the Content-Security-Policy.

CI (`.github/workflows/ci.yml`) runs all three layers on every pull request, enforces coverage thresholds, and audits dependencies. Dependabot keeps dependencies current.

### Deployment (GitHub Pages)

`.github/workflows/deploy.yml` runs the checks, builds with `BASE_PATH=/<repo>/` and publishes `dist/` to GitHub Pages on every push to `main` (or manually from the Actions tab).

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

## Security

- Strict Content-Security-Policy as a `<meta>` tag (only the site's own scripts, styles and images; no third-party origins). GitHub Pages can't send custom headers, so this is the strongest option there. Pages itself serves everything over HTTPS.
- Untrusted input (share links, saved settings) goes through the same strict schema as the generator: unknown values are rejected and every list and string is bounded.
- No accounts, cookies, analytics or server. Nothing personal is collected or sent anywhere; settings stay in your browser.
- External links open with `rel="noopener noreferrer"`. Dependencies are audited in CI and updated by Dependabot.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Data & licensing

Card facts (names, costs, types, sets) come from the MIT-licensed [dominiontabs](https://github.com/sumpfork/dominiontabs) card database, pinned to a specific revision. Card **rules text** is © Rio Grande Games and licensed only for non-commercial use, so it is used at build time solely to derive tags and is **not** shipped. Card names link to the [Dominion Strategy wiki](https://wiki.dominionstrategy.com/) instead.

Dominion is a trademark of Rio Grande Games. This is an unofficial, non-commercial fan project.
