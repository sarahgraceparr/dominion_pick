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
});
