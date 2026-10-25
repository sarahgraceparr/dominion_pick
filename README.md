# Dominion Pick

Picks a **fun** [Dominion](https://wiki.dominionstrategy.com/) kingdom from the sets you own: one codebase that runs in any browser and installs on Android as an app (PWA), backed by a small stateless API.

- Choose the sets (and editions) you own, the number of landscapes (Events, Projects, Ways, Landmarks, Traits), how many attacks you want, whether complex mechanics (Potions, Debt, Night…) are welcome, and how many sets to mix.
- **Lock** cards you like and pick again, or **swap** a single card.
- See _why_ the kingdom should be fun: detected synergies, possible strategies, and a score breakdown.
- Official setup is handled for you: Bane (Young Witch), Colony/Platinum, Shelters, Potion, Ruins, Boons/Hexes, Allies for Liaisons, Prophecies for Omens, Ferryman/Riverboat/Way of the Mouse set-asides, and more.
- **Share** a link that reproduces the exact kingdom. Kingdoms are generated from a seed, so the server stores nothing.
- Works **offline**: the same generator runs on the device when the server can't be reached.

## Install on Android

Open the site in Chrome, then use **⋮ → Add to Home screen / Install app**. It opens full-screen like a native app and keeps working offline. (If you'd prefer a Play Store package, the same build can be wrapped as a Trusted Web Activity with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). No code changes are needed.)

## How "fun" is decided

Each card is classified by its **roles** (the tags in `src/core/types.ts`):

| Role                                                 | Meaning                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| Village / Cantrip / Draw / Terminal                  | how a card affects your Action and card economy               |
| Trasher / Remodeler / Gainer / +Buy / Money / Sifter | deck-building tools                                           |
| Throne                                               | plays other cards several times                               |
| Attack (Curser, Hand-size, Junker, Deck)             | interaction, with **Defense** as counterplay                  |
| Alt VP / Cost reducer / Trash payoff / Duration      | alternative plans and special interactions                    |
| Complex                                              | Potion or Debt costs, Night, Boons/Hexes, Reserve, Traveller… |

Tags come from the card text through a heuristic classifier (`scripts/lib/derive-tags.ts`), which runs at build time. Known mistakes are fixed by hand in `scripts/tag-overrides.ts`.

The generator draws 300 random kingdoms that fit your settings, scores each one, and then picks among the best 15. Better kingdoms are more likely, but rerolls stay varied. The score (`src/core/scoring.ts`) follows common community strategy advice:

- **Synergies** (`src/core/synergy.ts`). Generic role pairs: villages plus terminal draw, Throne Room plus a strong terminal, trashers plus trash payoffs, +Buy plus cost reduction, gainers plus alt-VP, and counterplay to attacks. On top of these is a curated list of well-known combos (`src/core/combos.ts`), such as Workshop/Gardens, King's Court/Bridge, Fortress plus trashers, and Tunnel plus discarders. Returns diminish, and each card's participation is capped so that multi-role cards don't dominate.
- **Strategic depth.** An engine is possible (villages and draw), ideally with trashing and +Buy, alongside alternative VP plans.
- **Variety.** Many different roles, and a spread of costs including cheap openers and $5+ cards.
- **Interaction.** Some attacks, preferably with counterplay.
- **Penalties** for known un-fun patterns: stacked cursers, curses with no way to clean them up, villages with nothing to draw, terminal draw with no villages, and boards where nothing combos ("Big Money").

## Architecture

```
src/core     pure TypeScript domain logic shared by server and client
             (card data, classification, synergy, scoring, setup rules, seeded RNG, request schema)
src/server   Fastify API + static hosting of the web app (stateless)
src/web      React PWA (mobile-first, light/dark, offline)
scripts      build-time card data pipeline
tests/e2e    Playwright tests (desktop Chrome + Pixel 7 emulation)
```

The server is **stateless**. Every response is a pure function of the request, and kingdoms are reproducible from their seed, so any number of instances can run behind a load balancer. Settings live in the browser (`localStorage`) and in share links.

### API

| Method | Path               | Description                                                |
| ------ | ------------------ | ---------------------------------------------------------- |
| GET    | `/api/v1/health`   | liveness                                                   |
| GET    | `/api/v1/products` | products (sets/editions) and the card-data revision        |
| POST   | `/api/v1/kingdoms` | generate a kingdom (see `src/core/schema.ts` for the body) |

```bash
curl -X POST localhost:8080/api/v1/kingdoms -H 'content-type: application/json' \
  -d '{"products":["base2","intrigue2"],"landscapes":0,"attacks":"some","seed":"friday"}'
```

## Development

Requires Node 22+.

```bash
npm install
npm run dev:server   # API on :8080 (auto-reload)
npm run dev          # web app on :5173, proxies /api to :8080
```

| Command              | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run check`      | lint + format check + typecheck + unit/integration tests with coverage |
| `npm test`           | unit + integration tests (Vitest)                                      |
| `npm run test:e2e`   | builds, starts the real server and runs Playwright                     |
| `npm run build`      | production build: `dist/web` (PWA) + `dist/server`                     |
| `npm start`          | runs the production server                                             |
| `npm run build:data` | regenerates `src/core/data/cards.json` from the pinned upstream data   |

### Testing pyramid

1. **Unit** (most tests, fast): classifier, RNG, synergy rules, scoring, setup rules, generator invariants (determinism, filters, locks/bans), schema validation, settings/URL handling. `src/core/**`, `scripts/**`, and `src/web/*.test.ts`.
2. **Integration/component**: the HTTP API through Fastify's injector (validation, error codes, security headers, rate limiting, static/SPA serving), and React components with Testing Library against a fake API.
3. **End-to-end** (few): the production build in a real browser on desktop and an emulated Android phone, covering pick, share-link reproduction, lock/swap, settings, offline PWA, and the manifest.

CI (`.github/workflows/ci.yml`) runs all three layers, enforces coverage thresholds, audits production dependencies, and builds the Docker image. Dependabot keeps dependencies current.

### Deployment

```bash
docker build -t dominion-pick .
docker run -p 8080:8080 dominion-pick
```

| Variable                | Default | Purpose                                           |
| ----------------------- | ------- | ------------------------------------------------- |
| `PORT`                  | `8080`  | listen port                                       |
| `RATE_LIMIT_PER_MINUTE` | `120`   | per-IP request limit (per instance; `0` disables) |
| `TRUST_PROXY`           | `false` | set `true` behind a reverse proxy/load balancer   |
| `LOG_LEVEL`             | `info`  | pino log level                                    |

Serve it over HTTPS: a PWA requires HTTPS to install.

## Security

- All input is validated with a strict shared schema. Unknown fields are rejected, every list and string is bounded, and the body size is limited to 16 KB.
- Strict Content-Security-Policy (no inline scripts, no third-party origins), HSTS, `nosniff`, `frame-ancestors 'none'`, and other headers via Helmet.
- Per-IP rate limiting. Errors never leak internals (generic 500 bodies).
- No accounts, cookies, or server-side storage. Nothing personal is collected.
- The container runs as a non-root user with production dependencies only. Dependencies are audited in CI.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Data & licensing

Card facts (names, costs, types, sets) come from the MIT-licensed [dominiontabs](https://github.com/sumpfork/dominiontabs) card database, pinned to a specific revision. Card **rules text** is © Rio Grande Games and licensed only for non-commercial use, so it is used at build time solely to derive tags and is **not** shipped. Card names link to the [Dominion Strategy wiki](https://wiki.dominionstrategy.com/) instead.

Dominion is a trademark of Rio Grande Games. This is an unofficial, non-commercial fan project.
