/**
 * Theme configuration — the admin-customisable layer over the base tokens.
 *
 * Base tokens (`tokens.ts`) define the product's *semantic* roles and are
 * fixed. This module defines the *overlay* an administrator may change from
 * Admin → Branding: a per-mode rebrand of a safe, semantic subset (brand
 * accent and status colours), plus the workspace default mode and density.
 *
 * Two rules keep this safe:
 *
 *   1. **Semantic only.** Admins cannot set arbitrary CSS. They pick new
 *      values for existing roles, so every screen keeps its meaning and
 *      light/dark parity is preserved.
 *   2. **Overrides layer onto a complete palette.** `resolveColors` always
 *      returns a full `ColorTokens`, so a half-configured theme can never
 *      leave a role undefined.
 */

import {
  ColorTokens,
  DARK_TOKENS,
  Density,
  LIGHT_TOKENS,
  ThemeMode,
  tokensFor
} from './tokens';
import { getSync, remove as storageRemove, set as storageSet } from '../storage/local';

/** The colour roles an admin may rebrand per mode. */
export type RebrandableRole = 'accent' | 'success' | 'warn' | 'danger' | 'info' | 'focus';

export const REBRANDABLE_ROLES: RebrandableRole[] = [
  'accent',
  'success',
  'warn',
  'danger',
  'info',
  'focus'
];

export type RoleOverrides = Partial<Pick<ColorTokens, RebrandableRole>>;

export interface ThemeConfig {
  /** Shown in the shell and in exports. */
  brandName: string;
  overrides: { dark: RoleOverrides; light: RoleOverrides };
  defaultMode: ThemeMode;
  defaultDensity: Density;
}

export const DEFAULT_BRAND_NAME = 'Omnichannel Agent Platform';

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  brandName: DEFAULT_BRAND_NAME,
  overrides: { dark: {}, light: {} },
  defaultMode: 'dark',
  defaultDensity: 'comfortable'
};

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  dark: RoleOverrides;
  light: RoleOverrides;
}

/** Brand presets — each is a full accent (plus matching focus) per mode. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'indigo',
    label: 'Indigo (default)',
    description: 'The shipped brand — indigo accent, cool neutrals.',
    dark: {},
    light: {}
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Cyan-blue accent for a data-forward look.',
    dark: { accent: '#0ea5e9', focus: '#38bdf8' },
    light: { accent: '#0369a1', focus: '#0369a1' }
  },
  {
    id: 'emerald',
    label: 'Emerald',
    description: 'Green accent — often reads as “healthy”.',
    dark: { accent: '#10b981', focus: '#34d399' },
    light: { accent: '#047857', focus: '#047857' }
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Amber-orange accent for consumer brands.',
    dark: { accent: '#f97316', focus: '#fb923c' },
    light: { accent: '#c2410c', focus: '#c2410c' }
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Pink-red accent for a bold consumer feel.',
    dark: { accent: '#f43f5e', focus: '#fb7185' },
    light: { accent: '#be123c', focus: '#be123c' }
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Neutral accent — recedes so data leads.',
    dark: { accent: '#64748b', focus: '#94a3b8' },
    light: { accent: '#334155', focus: '#334155' }
  }
];

const STORAGE_KEY = 'oap_theme_v1';

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function sanitizeOverrides(input: unknown): RoleOverrides {
  if (!input || typeof input !== 'object') return {};
  const out: RoleOverrides = {};
  for (const role of REBRANDABLE_ROLES) {
    const value = (input as Record<string, unknown>)[role];
    if (typeof value === 'string' && isHexColor(value)) out[role] = value.trim();
  }
  return out;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact';
}

/** Merge a partial/unknown config with the defaults. Always returns a valid config. */
export function normalizeThemeConfig(input: unknown): ThemeConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<ThemeConfig>;
  const overrides = (raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {}) as {
    dark?: unknown;
    light?: unknown;
  };
  return {
    brandName:
      typeof raw.brandName === 'string' && raw.brandName.trim()
        ? raw.brandName.trim()
        : DEFAULT_THEME_CONFIG.brandName,
    overrides: {
      dark: sanitizeOverrides(overrides.dark),
      light: sanitizeOverrides(overrides.light)
    },
    defaultMode: isThemeMode(raw.defaultMode) ? raw.defaultMode : DEFAULT_THEME_CONFIG.defaultMode,
    defaultDensity: isDensity(raw.defaultDensity) ? raw.defaultDensity : DEFAULT_THEME_CONFIG.defaultDensity
  };
}

export function loadThemeConfig(): ThemeConfig {
  const raw = getSync<unknown>(STORAGE_KEY, null);
  if (!raw) return { ...DEFAULT_THEME_CONFIG, overrides: { dark: {}, light: {} } };
  return normalizeThemeConfig(raw);
}

export function saveThemeConfig(config: ThemeConfig): void {
  storageSet(STORAGE_KEY, config);
}

export function clearThemeConfig(): void {
  storageRemove(STORAGE_KEY);
}

/** Full colour palette for a mode, with this config's overrides applied. */
export function resolveColors(config: ThemeConfig, mode: ThemeMode): ColorTokens {
  const base = tokensFor(mode);
  const merged: ColorTokens = { ...base, ...config.overrides[mode] };
  // If the accent moves but focus was not set, keep focus legible against it.
  if (config.overrides[mode].accent && !config.overrides[mode].focus) {
    merged.focus = merged.accent;
  }
  return merged;
}

/** Apply a preset's role values, leaving other roles untouched. */
export function withPreset(config: ThemeConfig, presetId: string): ThemeConfig {
  const preset = THEME_PRESETS.find(p => p.id === presetId);
  if (!preset) return config;
  return {
    ...config,
    overrides: {
      dark: { ...config.overrides.dark, ...preset.dark },
      light: { ...config.overrides.light, ...preset.light }
    }
  };
}

/** Which preset (if any) the current accent values match. */
export function detectPreset(config: ThemeConfig): string | null {
  const match = THEME_PRESETS.find(
    p =>
      (p.dark.accent ?? DARK_TOKENS.accent) ===
        (config.overrides.dark.accent ?? DARK_TOKENS.accent) &&
      (p.light.accent ?? LIGHT_TOKENS.accent) ===
        (config.overrides.light.accent ?? LIGHT_TOKENS.accent)
  );
  return match ? match.id : null;
}
