/**
 * Theme runtime — the one place theme state lives.
 *
 * It owns the active mode, density and admin theme config, projects the
 * result to the DOM and onto the mutable `theme` / `density` objects the UI
 * reads during render, and notifies subscribers so the shell can re-render.
 *
 * Kept intentionally tiny and framework-free: React components consume it
 * through `ui.tsx`, but nothing here imports React.
 */

import {
  ColorTokens,
  DensityTokens,
  DENSITY_TOKENS,
  ThemeMode,
  Density,
  applyColorTokens
} from './tokens';
import {
  DEFAULT_THEME_CONFIG,
  ThemeConfig,
  clearThemeConfig,
  loadThemeConfig,
  resolveColors,
  saveThemeConfig
} from './themeConfig';

let config: ThemeConfig = loadThemeConfig();
let mode: ThemeMode = config.defaultMode;
let currentDensity: Density = config.defaultDensity;

/** Live token objects read during render. Mutated in place, like the old theme. */
export const theme: ColorTokens = { ...resolveColors(config, mode) };
export const density: DensityTokens = { ...DENSITY_TOKENS[currentDensity] };

const listeners = new Set<() => void>();
let applied = false;

function apply(): void {
  const colors = resolveColors(config, mode);
  (Object.keys(colors) as Array<keyof ColorTokens>).forEach(key => {
    theme[key] = colors[key];
  });
  Object.assign(density, DENSITY_TOKENS[currentDensity]);
  applyColorTokens(colors, currentDensity, mode);
  listeners.forEach(fn => fn());
}

/** Push the persisted theme to the DOM. Idempotent; call once from app boot. */
export function initTheme(): void {
  if (applied) return;
  applied = true;
  apply();
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setThemeMode(next: ThemeMode): void {
  mode = next;
  apply();
}

export function setDensity(next: Density): void {
  currentDensity = next;
  apply();
}

export function setThemeConfig(next: ThemeConfig): void {
  config = next;
  saveThemeConfig(next);
  apply();
}

/** Restore the shipped defaults and persist that reset. */
export function resetThemeConfig(): void {
  clearThemeConfig();
  config = { ...DEFAULT_THEME_CONFIG, overrides: { dark: {}, light: {} } };
  mode = config.defaultMode;
  currentDensity = config.defaultDensity;
  apply();
}

export function getThemeMode(): ThemeMode {
  return mode;
}

export function getDensity(): Density {
  return currentDensity;
}

export function getThemeConfig(): ThemeConfig {
  return config;
}

/** The fully-resolved palette currently in effect (base + admin overrides). */
export function getResolvedColors(): ColorTokens {
  return resolveColors(config, mode);
}
