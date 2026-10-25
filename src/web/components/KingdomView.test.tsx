import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cardsInProducts, generateKingdom, getCard } from '../../core';
import { KingdomView } from './KingdomView';

const noop = vi.fn();

describe('KingdomView', () => {
  it('shows the Bane, Ally and setup notes', () => {
    const liaison = cardsInProducts(['allies']).find((c) => c.types.includes('Liaison') && c.kind === 'kingdom')!;
    const kingdom = generateKingdom({ seed: 'view', products: ['cornguilds2', 'allies'], locked: ['young-witch', liaison.id] });
    render(<KingdomView kingdom={kingdom} owned={['cornguilds2', 'allies']} locked={new Set()} onToggleLock={noop} onSwap={noop} />);

    const extras = screen.getByRole('list', { name: 'Extra cards' });
    const bane = kingdom.setup.find((n) => n.title === 'Bane')!;
    expect(within(extras).getByRole('link', { name: getCard(bane.cardId!)!.name })).toBeInTheDocument();
    expect(within(extras).getByRole('link', { name: kingdom.extras[0]!.name })).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    // Extra cards can't be locked or swapped.
    expect(within(extras).queryByRole('button')).toBeNull();
  });

  it('marks locked cards and explains an uneventful board', () => {
    const kingdom = { ...generateKingdom({ seed: 'plain', products: ['base2'], landscapes: 0 }), synergies: [] };
    const first = kingdom.cards[0]!;
    render(<KingdomView kingdom={kingdom} owned={['base2']} locked={new Set([first.id])} onToggleLock={noop} onSwap={noop} />);
    expect(screen.getByRole('button', { name: `Unlock ${first.name}` })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/No standout combos/)).toBeInTheDocument();
    expect(screen.queryByText('Landscapes')).toBeNull();
  });

  it('links card names to the wiki in a new tab without leaking the opener', () => {
    const kingdom = generateKingdom({ seed: 'links', products: ['base2'] });
    render(<KingdomView kingdom={kingdom} owned={['base2']} locked={new Set()} onToggleLock={noop} onSwap={noop} />);
    const link = screen.getAllByRole('link')[0]!;
    expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wiki\.dominionstrategy\.com\//));
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('explains chains step by step, flags loops and marks Trait piles', () => {
    const base = generateKingdom({ seed: 'chain', products: ['darkages', 'plunder'], landscapes: 0 });
    const target = base.cards[0]!;
    const kingdom = {
      ...base,
      setup: [...base.setup, { title: 'Inherited', detail: `Put Inherited on ${target.name}`, targetId: target.id }],
      synergies: [
        {
          kind: 'chain' as const,
          cards: [base.cards[0]!.id, base.cards[1]!.id, base.cards[2]!.id],
          reason: 'A + B + C',
          steps: ['A sets off B', 'B sets off C'],
          loop: true,
          weight: 10,
        },
      ],
    };
    render(<KingdomView kingdom={kingdom} owned={[]} locked={new Set()} onToggleLock={noop} onSwap={noop} />);
    expect(screen.getByText('A + B + C')).toBeInTheDocument();
    expect(screen.getByText('repeats')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(expect.arrayContaining(['A sets off B', 'B sets off C']));
    const kingdomList = screen.getByRole('list', { name: 'Kingdom cards' });
    expect(within(kingdomList).getByText('Inherited')).toBeInTheDocument();
  });
});
