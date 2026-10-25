import { generateRequestSchema, type AttackPreference, type GenerateRequestInput } from '../core';

/** User-tunable options, persisted per device and mirrored in the share URL. */
export interface Settings {
  products: string[];
  landscapes: number;
  attacks: AttackPreference;
  allowComplex: boolean;
  maxProducts: number;
}

export const DEFAULT_SETTINGS: Settings = {
  products: ['base2'],
  landscapes: 1,
  attacks: 'any',
  allowComplex: true,
  maxProducts: 0,
};

const STORAGE_KEY = 'dominion-pick:settings:v1';

/** Loads settings from localStorage; any corrupt or missing value falls back to defaults. */
export function loadSettings(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitize(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, quota); settings just won't persist.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Validates untrusted settings (from storage or a URL) through the shared request schema. */
export function sanitize(input: Partial<Settings>): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...pick(input) };
  const parsed = generateRequestSchema.safeParse(merged);
  if (!parsed.success) return DEFAULT_SETTINGS;
  const { products, landscapes, attacks, allowComplex, maxProducts } = parsed.data;
  return { products, landscapes, attacks, allowComplex, maxProducts };
}

function pick(input: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (Array.isArray(input.products)) out.products = input.products.filter((p): p is string => typeof p === 'string');
  if (typeof input.landscapes === 'number') out.landscapes = input.landscapes;
  if (typeof input.attacks === 'string') out.attacks = input.attacks;
  if (typeof input.allowComplex === 'boolean') out.allowComplex = input.allowComplex;
  if (typeof input.maxProducts === 'number') out.maxProducts = input.maxProducts;
  return out;
}

export interface ShareState {
  settings: Settings;
  seed?: string;
  locked: string[];
  banned: string[];
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

/** Encodes everything needed to reproduce a kingdom into URL query parameters. */
export function toQuery(state: ShareState): string {
  const q = new URLSearchParams();
  if (state.seed) q.set('seed', state.seed);
  q.set('p', state.settings.products.join(','));
  q.set('l', String(state.settings.landscapes));
  q.set('a', state.settings.attacks);
  q.set('c', state.settings.allowComplex ? '1' : '0');
  q.set('m', String(state.settings.maxProducts));
  if (state.locked.length) q.set('lock', state.locked.join(','));
  if (state.banned.length) q.set('ban', state.banned.join(','));
  return q.toString();
}

/** Parses a share URL; returns undefined if it carries no kingdom or is invalid. */
export function fromQuery(search: string): ShareState | undefined {
  const q = new URLSearchParams(search);
  const seed = q.get('seed');
  if (!seed) return undefined;
  const request: GenerateRequestInput = {
    seed,
    products: list(q.get('p')),
    landscapes: Number(q.get('l') ?? DEFAULT_SETTINGS.landscapes),
    attacks: (q.get('a') ?? DEFAULT_SETTINGS.attacks) as AttackPreference,
    allowComplex: q.get('c') !== '0',
    maxProducts: Number(q.get('m') ?? 0),
    locked: list(q.get('lock')),
    banned: list(q.get('ban')),
  };
  const parsed = generateRequestSchema.safeParse(request);
  if (!parsed.success) return undefined;
  const { products, landscapes, attacks, allowComplex, maxProducts, locked, banned } = parsed.data;
  return { seed, settings: { products, landscapes, attacks, allowComplex, maxProducts }, locked, banned };
}

export function hasStoredSettings(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): boolean {
  try {
    return !!storage?.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
