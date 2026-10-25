import { useCallback, useEffect, useRef, useState } from 'react';
import { generateKingdom, randomSeed, type Kingdom } from '../core';
import { KingdomView } from './components/KingdomView';
import { SettingsPanel } from './components/SettingsPanel';
import { fromQuery, hasStoredSettings, loadSettings, saveSettings, toQuery, type Settings } from './settings';

export function App() {
  const initial = useRef(fromQuery(window.location.search));
  const [settings, setSettings] = useState<Settings>(() => initial.current?.settings ?? loadSettings());
  const [kingdom, setKingdom] = useState<Kingdom>();
  const [locked, setLocked] = useState<Set<string>>(() => new Set(initial.current?.locked));
  const [banned, setBanned] = useState<string[]>(() => initial.current?.banned ?? []);
  const [error, setError] = useState('');
  const [surprise, setSurprise] = useState(false);
  const [toast, setToast] = useState('');
  const firstVisit = useRef(!hasStoredSettings() && !initial.current);

  // Kingdoms are generated entirely on the device; the seed makes them reproducible from a link.
  const generate = useCallback((opts: { seed?: string; locked: string[]; banned: string[]; settings: Settings; surprise?: boolean }) => {
    try {
      const seed = opts.seed ?? randomSeed();
      const surprise = opts.surprise ?? false;
      setKingdom(generateKingdom({ ...opts.settings, seed, locked: opts.locked, banned: opts.banned, surprise }));
      setSurprise(surprise);
      setError('');
      const query = toQuery({ settings: opts.settings, seed, locked: opts.locked, banned: opts.banned, surprise });
      window.history.replaceState(null, '', `?${query}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  }, []);

  // Show a kingdom straight away: the shared one from the URL, or a fresh pick.
  useEffect(() => {
    const shared = initial.current;
    generate({ seed: shared?.seed, settings, locked: [...locked], banned, surprise: shared?.surprise });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
  };

  const pick = (withSurprise = false) => {
    setBanned([]);
    generate({ settings, locked: [...locked], banned: [], surprise: withSurprise });
  };

  const toggleLock = (id: string) => {
    const next = new Set(locked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLocked(next);
  };

  const swap = (id: string) => {
    if (!kingdom) return;
    // Keep everything else exactly as it is and forbid the swapped card.
    const keep = [...kingdom.cards, ...kingdom.landscapes].map((c) => c.id).filter((c) => c !== id);
    const nextBanned = [...new Set([...banned, id])];
    setBanned(nextBanned);
    setLocked(new Set([...locked].filter((c) => c !== id)));
    generate({ settings: { ...settings, landscapes: kingdom.landscapes.length }, locked: keep, banned: nextBanned, surprise });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Dominion kingdom', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      setToast('Could not share — copy the address bar instead');
    }
    window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dominion Pick</h1>
        <p>Fun, synergistic kingdoms from the sets you own.</p>
      </header>
      <main>
        <SettingsPanel settings={settings} onChange={updateSettings} defaultOpen={firstVisit.current} />
        <div className="toolbar">
          <button type="button" className="primary" onClick={() => pick()}>
            {locked.size ? `Pick again (keep ${locked.size})` : 'Pick a kingdom'}
          </button>
          <button type="button" className="surprise" onClick={() => pick(true)} title="Rule-bending landscapes and unexpected combos">
            ✨ Surprise me
          </button>
          <button type="button" onClick={() => void share()} disabled={!kingdom}>
            Share
          </button>
        </div>
        <div aria-live="polite" className="status">
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {toast && <p className="toast">{toast}</p>}
        </div>
        {kingdom && (
          <KingdomView
            kingdom={kingdom}
            owned={settings.products}
            locked={locked}
            onToggleLock={toggleLock}
            onSwap={swap}
            surprise={surprise}
          />
        )}
      </main>
      <footer>
        <p>
          Unofficial fan tool, not affiliated with Rio Grande Games. Card names link to the{' '}
          <a href="https://wiki.dominionstrategy.com/" target="_blank" rel="noopener noreferrer">
            Dominion Strategy wiki
          </a>
          . Card data derived from{' '}
          <a href="https://github.com/sumpfork/dominiontabs" target="_blank" rel="noopener noreferrer">
            dominiontabs
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
