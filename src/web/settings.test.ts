import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, fromQuery, hasStoredSettings, loadSettings, sanitize, saveSettings, toQuery } from './settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

describe('settings storage', () => {
  it('round-trips settings', () => {
    const storage = memoryStorage();
    const settings = { ...DEFAULT_SETTINGS, products: ['base2', 'seaside2'], attacks: 'none' as const };
    saveSettings(settings, storage);
    expect(hasStoredSettings(storage)).toBe(true);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it('falls back to defaults for missing or corrupt data', () => {
    expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(memoryStorage({ 'dominion-pick:settings:v1': '{not json' }))).toEqual(DEFAULT_SETTINGS);
    expect(hasStoredSettings(memoryStorage())).toBe(false);
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
    expect(hasStoredSettings(broken)).toBe(false);
  });

  it('sanitize drops invalid values', () => {
    expect(sanitize({ products: ['base2'], landscapes: 99 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitize({ products: ['base2', 7 as unknown as string] }).products).toEqual(['base2']);
  });
});

describe('share URLs', () => {
  it('round-trips through the query string', () => {
    const state = {
      seed: 'abc',
      settings: { products: ['base2', 'intrigue2'], landscapes: 2, attacks: 'some' as const, allowComplex: false, maxProducts: 2 },
      locked: ['village'],
      banned: ['witch'],
    };
    expect(fromQuery(`?${toQuery(state)}`)).toEqual(state);
  });

  it('ignores URLs without a seed or with invalid data', () => {
    expect(fromQuery('')).toBeUndefined();
    expect(fromQuery('?seed=x&p=nope')).toBeUndefined();
    expect(fromQuery('?seed=<script>')).toBeUndefined();
  });
});
