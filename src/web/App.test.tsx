import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKingdom, type GenerateRequestInput } from '../core';
import { App } from './App';

/** Fake API backed by the real generator, recording each request body. */
function mockApi() {
  const requests: GenerateRequestInput[] = [];
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as GenerateRequestInput;
    requests.push(body);
    return new Response(JSON.stringify(generateKingdom(body)), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { requests, fetchMock };
}

const cards = () => within(screen.getByRole('list', { name: 'Kingdom cards' })).getAllByTestId('card');

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows a kingdom on first load and opens the settings', async () => {
    mockApi();
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    expect(screen.getByText(/Your sets & options/).closest('details')).toHaveAttribute('open');
    expect(screen.getByTestId('score')).toBeInTheDocument();
    expect(window.location.search).toMatch(/seed=/);
  });

  it('reproduces a shared kingdom from the URL', async () => {
    const { requests } = mockApi();
    window.history.replaceState(null, '', '/?seed=shared1&p=base2&l=0&a=any&c=1&m=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    expect(requests[0]).toMatchObject({ seed: 'shared1', products: ['base2'], landscapes: 0 });
    const expected = generateKingdom({ seed: 'shared1', products: ['base2'], landscapes: 0 });
    expect(cards().map((c) => within(c).getByRole('link').textContent)).toEqual(expected.cards.map((c) => c.name));
  });

  it('keeps locked cards when picking again', async () => {
    const user = userEvent.setup();
    const { requests } = mockApi();
    window.history.replaceState(null, '', '/?seed=lock&p=base2&l=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    const first = cards()[0]!;
    const name = within(first).getByRole('link').textContent!;
    await user.click(within(first).getByRole('button', { name: `Lock ${name}` }));
    await user.click(screen.getByRole('button', { name: /Pick again \(keep 1\)/ }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.locked).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole('link', { name })).toBeInTheDocument());
  });

  it('swaps a single card and keeps the rest', async () => {
    const user = userEvent.setup();
    const { requests } = mockApi();
    window.history.replaceState(null, '', '/?seed=swap&p=base2,intrigue2&l=0');
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    const before = cards().map((c) => within(c).getByRole('link').textContent!);
    await user.click(screen.getByRole('button', { name: `Swap ${before[3]}` }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.locked).toHaveLength(9);
    await waitFor(() => {
      const after = cards().map((c) => within(c).getByRole('link').textContent!);
      expect(after).not.toContain(before[3]);
      expect(after.filter((n) => before.includes(n))).toHaveLength(9);
    });
  });

  it('persists changed settings and sends them with the next pick', async () => {
    const user = userEvent.setup();
    const { requests } = mockApi();
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    await user.click(screen.getByRole('checkbox', { name: /^Intrigue\s*2nd Edition$/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Attacks' }), 'none');
    await user.click(screen.getByRole('button', { name: 'Pick a kingdom' }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]).toMatchObject({ products: ['base2', 'intrigue2'], attacks: 'none' });
    expect(JSON.parse(localStorage.getItem('dominion-pick:settings:v1')!)).toMatchObject({ attacks: 'none' });
  });

  it('falls back to on-device generation when offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('shows API errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Not enough cards' }), { status: 422 })));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not enough cards');
  });

  it('copies the share link when Web Share is unavailable', async () => {
    const user = userEvent.setup();
    mockApi();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);
    await waitFor(() => expect(cards()).toHaveLength(10));
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('seed='));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });
});
