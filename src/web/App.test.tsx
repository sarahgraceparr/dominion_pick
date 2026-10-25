import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKingdom } from '../core';
import { App } from './App';
import { fromQuery } from './settings';

const cards = () => within(screen.getByRole('list', { name: 'Kingdom cards' })).getAllByTestId('card');
const cardNames = () => cards().map((c) => within(c).getByRole('link').textContent!);
/** The current URL describes exactly what was generated, so it doubles as a record of the last request. */
const currentState = () => fromQuery(window.location.search)!;

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('shows a kingdom on first load and opens the settings', async () => {
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    expect(screen.getByText(/Your sets & options/).closest('details')).toHaveAttribute('open');
    expect(screen.getByTestId('score')).toBeInTheDocument();
    expect(window.location.search).toMatch(/seed=/);
  });

  it('reproduces a shared kingdom from the URL', async () => {
    window.history.replaceState(null, '', '/?seed=shared1&p=base2&l=0&a=any&c=1&m=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    const expected = generateKingdom({ seed: 'shared1', products: ['base2'], landscapes: 0 });
    expect(cardNames()).toEqual(expected.cards.map((c) => c.name));
  });

  it('keeps locked cards when picking again', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?seed=lock&p=base2&l=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    const name = cardNames()[0]!;
    await user.click(screen.getByRole('button', { name: `Lock ${name}` }));
    await user.click(screen.getByRole('button', { name: /Pick again \(keep 1\)/ }));
    await waitFor(() => expect(currentState().seed).not.toBe('lock'));
    expect(currentState().locked).toHaveLength(1);
    expect(cardNames()).toContain(name);
  });

  it('swaps a single card and keeps the rest', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?seed=swap&p=base2,intrigue2&l=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    const before = cardNames();
    await user.click(screen.getByRole('button', { name: `Swap ${before[3]}` }));
    await waitFor(() => expect(cardNames()).not.toContain(before[3]));
    expect(cardNames().filter((n) => before.includes(n))).toHaveLength(9);
    expect(currentState().banned).toHaveLength(1);
  });

  it('persists changed settings and uses them for the next pick', async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    await user.click(screen.getByRole('checkbox', { name: /^Intrigue\s*2nd Edition$/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Attacks' }), 'none');
    await user.click(screen.getByRole('button', { name: 'Pick a kingdom' }));
    expect(currentState().settings).toMatchObject({ products: ['base2', 'intrigue2'], attacks: 'none' });
    expect(JSON.parse(localStorage.getItem('dominion-pick:settings:v1')!)).toMatchObject({ attacks: 'none' });
  });

  it('shows an error when the settings leave too few cards', async () => {
    const banned = ['village', 'smithy', 'chapel', 'cellar', 'moat', 'market', 'militia', 'mine', 'witch', 'library'];
    const more = ['gardens', 'remodel', 'workshop', 'festival', 'laboratory', 'bureaucrat', 'throne-room'];
    window.history.replaceState(null, '', `/?seed=x&p=base2&l=0&ban=${[...banned, ...more].join(',')}`);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Not enough cards/);
  });

  it('copies the share link when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('seed='));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });
});
