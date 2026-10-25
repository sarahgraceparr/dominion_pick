import type { Card } from '../../core';
import { wikiUrl } from '../../core';
import { costLabel, frameClass, roleLabels, setLabel } from '../labels';

interface Props {
  card: Card;
  owned: readonly string[];
  locked?: boolean;
  onToggleLock?: (id: string) => void;
  onSwap?: (id: string) => void;
  note?: string;
}

export function CardTile({ card, owned, locked = false, onToggleLock, onSwap, note }: Props) {
  const cost = costLabel(card);
  return (
    <li className={`card ${frameClass(card)}${locked ? ' is-locked' : ''}`} data-testid="card">
      <div className="card-head">
        {cost && (
          <span className="cost" aria-label={`Cost ${cost}`}>
            {cost}
          </span>
        )}
        <a className="card-name" href={wikiUrl(card)} target="_blank" rel="noopener noreferrer">
          {card.name}
        </a>
      </div>
      <div className="card-meta">
        <span>{card.types.join(' – ')}</span>
        <span className="set">{setLabel(card, owned)}</span>
      </div>
      {note && <div className="card-note">{note}</div>}
      <ul className="roles" aria-label="Roles">
        {roleLabels(card).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {(onToggleLock || onSwap) && (
        <div className="card-actions">
          {onToggleLock && (
            <button
              type="button"
              className="icon-btn"
              aria-pressed={locked}
              aria-label={`${locked ? 'Unlock' : 'Lock'} ${card.name}`}
              title={locked ? 'Locked: kept when you pick again' : 'Lock to keep it when you pick again'}
              onClick={() => onToggleLock(card.id)}
            >
              {locked ? '🔒' : '🔓'}
            </button>
          )}
          {onSwap && (
            <button
              type="button"
              className="icon-btn"
              aria-label={`Swap ${card.name}`}
              title="Replace just this card"
              onClick={() => onSwap(card.id)}
            >
              ↻
            </button>
          )}
        </div>
      )}
    </li>
  );
}
