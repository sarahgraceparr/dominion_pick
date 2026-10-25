import type { Card, Kingdom } from '../../core';
import { getCard } from '../../core';
import { CardTile } from './CardTile';

interface Props {
  kingdom: Kingdom;
  owned: readonly string[];
  locked: ReadonlySet<string>;
  onToggleLock: (id: string) => void;
  onSwap: (id: string) => void;
}

export function KingdomView({ kingdom, owned, locked, onToggleLock, onSwap }: Props) {
  const nameOf = (id: string) => getCard(id)?.name ?? id;
  const setupCards = kingdom.setup
    .filter((n) => n.cardId && !kingdom.extras.some((e) => e.id === n.cardId))
    .map((n) => ({ card: getCard(n.cardId!)!, note: n.title }))
    .filter((x): x is { card: Card; note: string } => !!x.card);
  const tile = (card: Card) => (
    <CardTile key={card.id} card={card} owned={owned} locked={locked.has(card.id)} onToggleLock={onToggleLock} onSwap={onSwap} />
  );

  return (
    <section className="kingdom" aria-labelledby="kingdom-title">
      <div className="kingdom-header">
        <h2 id="kingdom-title">Your kingdom</h2>
        <div className="score" title="Higher means more synergy, variety and interaction">
          <span className="score-value" data-testid="score">
            {kingdom.score.total}
          </span>
          <span className="score-label">fun score</span>
        </div>
      </div>
      <ul className="chips" aria-label="Strategies">
        {kingdom.score.archetypes.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <ul className="card-grid" aria-label="Kingdom cards">
        {kingdom.cards.map(tile)}
      </ul>

      {kingdom.landscapes.length > 0 && (
        <>
          <h3>Landscapes</h3>
          <ul className="card-grid wide" aria-label="Landscapes">
            {kingdom.landscapes.map(tile)}
          </ul>
        </>
      )}

      {(kingdom.extras.length > 0 || setupCards.length > 0) && (
        <>
          <h3>Also in this game</h3>
          <ul className="card-grid wide" aria-label="Extra cards">
            {kingdom.extras.map((c) => (
              <CardTile key={c.id} card={c} owned={owned} note={c.kind === 'ally' ? 'Ally' : 'Prophecy'} />
            ))}
            {setupCards.map(({ card, note }) => (
              <CardTile key={card.id} card={card} owned={owned} note={note} />
            ))}
          </ul>
        </>
      )}

      {kingdom.setup.length > 0 && (
        <>
          <h3>Setup</h3>
          <ul className="notes">
            {kingdom.setup.map((n) => (
              <li key={n.title}>
                <strong>{n.title}:</strong> {n.detail}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Why it should be fun</h3>
      {kingdom.synergies.length > 0 ? (
        <ul className="notes synergies">
          {kingdom.synergies.map((s) => (
            <li key={s.reason}>
              {s.reason}
              <span className="visually-hidden"> ({s.cards.map(nameOf).join(', ')})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No standout combos — a good board for straightforward play.</p>
      )}
      <details className="breakdown">
        <summary>Score breakdown</summary>
        <table>
          <tbody>
            {kingdom.score.parts.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.label}</th>
                <td className={p.value < 0 ? 'neg' : 'pos'}>
                  {p.value > 0 ? '+' : ''}
                  {p.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="seed">
        Seed <code>{kingdom.seed}</code>
      </p>
    </section>
  );
}
