import { useState } from 'react';
import { allProducts, EMPHASES, EMPHASIS_RULES, type AttackPreference, type Emphasis } from '../../core';
import type { Settings } from '../settings';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  defaultOpen?: boolean;
}

const products = allProducts();

export function SettingsPanel({ settings, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const owned = new Set(settings.products);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });
  const toggleProduct = (id: string) => {
    const next = new Set(owned);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set(
      'products',
      products.filter((p) => next.has(p.id)).map((p) => p.id),
    );
  };

  const toggleEmphasis = (e: Emphasis) =>
    set('emphasis', settings.emphasis.includes(e) ? settings.emphasis.filter((x) => x !== e) : [...settings.emphasis, e]);

  return (
    <details className="settings" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        Your sets &amp; options <span className="summary-hint">({settings.products.length || 'all'} sets)</span>
      </summary>
      <fieldset>
        <legend>Sets you own</legend>
        <div className="row">
          <button
            type="button"
            className="link-btn"
            onClick={() =>
              set(
                'products',
                products.map((p) => p.id),
              )
            }
          >
            Select all
          </button>
          <button type="button" className="link-btn" onClick={() => set('products', [])}>
            Clear
          </button>
        </div>
        <div className="product-list">
          {products.map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={owned.has(p.id)} onChange={() => toggleProduct(p.id)} />
              <span>
                {p.name}
                {p.edition && <small> {p.edition}</small>}
              </span>
            </label>
          ))}
        </div>
        {settings.products.length === 0 && <p className="hint">No sets selected — every set will be used.</p>}
      </fieldset>

      <div className="option-grid">
        <label>
          Landscapes
          <select value={settings.landscapes} onChange={(e) => set('landscapes', Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Attacks
          <select value={settings.attacks} onChange={(e) => set('attacks', e.target.value as AttackPreference)}>
            <option value="any">Any</option>
            <option value="some">A few (max 2)</option>
            <option value="none">None</option>
          </select>
        </label>
        <label>
          Mix at most
          <select value={settings.maxProducts} onChange={(e) => set('maxProducts', Number(e.target.value))}>
            <option value={0}>any number of sets</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} set{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.allowComplex} onChange={(e) => set('allowComplex', e.target.checked)} />
          <span>Allow complex mechanics (Potions, Debt, Night…)</span>
        </label>
      </div>

      <fieldset className="emphasis">
        <legend>Emphasize</legend>
        <div className="toggle-chips">
          {EMPHASES.map((e) => (
            <label key={e} className="toggle-chip">
              <input type="checkbox" checked={settings.emphasis.includes(e)} onChange={() => toggleEmphasis(e)} />
              <span>{EMPHASIS_RULES[e].label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </details>
  );
}
