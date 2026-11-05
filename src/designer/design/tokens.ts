/**
 * Design tokens — the single source of truth for colour, density and motion.
 *
 * The platform ships two guarantees the enterprise spec calls out explicitly:
 *
 *   1. **Light/dark parity.** Every semantic role exists, with a value, in
 *      both modes. There is no role that only has a dark value; a missing
 *      value is a bug the parity test catches.
 *   2. **Density modes.** The same UI renders `comfortable` or `compact`.
 *      Density only changes spacing/type scale, never colour or structure,
 *      so a screen keeps its meaning when a power user tightens it.
 *
 * `applyTokens` projects the current tokens onto the document as CSS custom
 * properties (`--cx-*`) plus `data-theme` / `data-density` attributes. Plain
 * CSS and inline styles can both consume them, which keeps the migration off
 * the old mutable `theme` object incremental rather than a big-bang rewrite.
 */

export type ThemeMode = 'dark' | 'light';
export type Density = 'comfortable' | 'compact';

/**
 * Colour roles.
 *
 * The first block is the legacy vocabulary the existing pages already read
 * (`bg`, `panel`, `muted`, `warn`, …). The second block is the semantic
 * vocabulary new work should prefer. `bg`/`panel`/`input`/`code` are surfaces,
 * not colours, so they keep their names.
 */
export interface ColorTokens {
  // surfaces
  bg: string;
  panel: string;
  panel2: string;
  input: string;
  code: string;
  rail: string;

  // lines
  border: string;
  borderStrong: string;
  railBorder: string;

  // text
  text: string;
  muted: string;
  subtle: string;

  // brand + status
  accent: string;
  accentContrast: string;
  success: string;
  warn: string;
  /** Text drawn on a `warn` fill — flips with the theme for contrast. */
  onWarn: string;
  danger: string;
  info: string;

  // interaction
  focus: string;
  overlay: string;
  /** Elevation shadow, tuned per mode (darker surfaces need less alpha). */
  shadow: string;
}

export const DARK_TOKENS: ColorTokens = {
  bg: '#0f0f1a',
  panel: '#15152a',
  panel2: '#1a1a2e',
  input: '#0d0d18',
  code: '#0b0b14',
  rail: '#0d0d18',

  border: '#2c2c44',
  borderStrong: '#3a3a56',
  railBorder: '#26263a',

  text: '#e8e8f2',
  muted: '#8b8ba7',
  subtle: '#5f5f78',

  accent: '#6164f2',
  accentContrast: '#ffffff',
  success: '#10b981',
  warn: '#f59e0b',
  onWarn: '#1a1a2e',
  danger: '#ef4449',
  info: '#38bdf8',

  focus: '#8b5cf6',
  overlay: 'rgba(0, 0, 0, 0.55)',
  shadow: 'rgba(0, 0, 0, 0.45)'
};

export const LIGHT_TOKENS: ColorTokens = {
  bg: '#f6f7fb',
  panel: '#ffffff',
  panel2: '#f1f2f8',
  input: '#ffffff',
  code: '#f7f8fc',
  rail: '#eceef6',

  border: '#d7d9e6',
  borderStrong: '#c3c6d8',
  railBorder: '#dfe1ec',

  text: '#16182b',
  muted: '#5c6079',
  subtle: '#8a8fa6',

  accent: '#4f46e5',
  accentContrast: '#ffffff',
  success: '#047857',
  warn: '#b45309',
  onWarn: '#ffffff',
  danger: '#dc2626',
  info: '#0369a1',

  focus: '#4f46e5',
  overlay: 'rgba(16, 18, 43, 0.45)',
  shadow: 'rgba(16, 18, 43, 0.14)'
};

export interface DensityTokens {
  /** Base control padding, vertical. */
  controlPadY: number;
  /** Base control padding, horizontal. */
  controlPadX: number;
  /** Table/list row padding. */
  rowPadY: number;
  rowPadX: number;
  /** Page / card padding. */
  outer: number;
  inner: number;
  gap: number;
  radius: number;
  fontBase: number;
  fontSmall: number;
  lineHeight: number;
}

export const DENSITY_TOKENS: Record<Density, DensityTokens> = {
  comfortable: {
    controlPadY: 8,
    controlPadX: 14,
    rowPadY: 8,
    rowPadX: 10,
    outer: 20,
    inner: 16,
    gap: 12,
    radius: 8,
    fontBase: 13,
    fontSmall: 11,
    lineHeight: 1.55
  },
  compact: {
    controlPadY: 5,
    controlPadX: 10,
    rowPadY: 5,
    rowPadX: 8,
    outer: 14,
    inner: 12,
    gap: 8,
    radius: 6,
    fontBase: 12,
    fontSmall: 10,
    lineHeight: 1.4
  }
};

export interface MotionTokens {
  fast: string;
  base: string;
  slow: string;
  /** Standard easing; respects reduced-motion at the CSS layer. */
  easing: string;
}

export const MOTION: MotionTokens = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  easing: 'cubic-bezier(0.2, 0, 0, 1)'
};

/**
 * Locked type scale (px) — every shared primitive sets type from here, so
 * body/small/caption never drift per file. Page-level one-offs should map
 * to the nearest step rather than inventing a size.
 */
export const TYPE_SCALE = {
  micro: 10,
  caption: 11,
  small: 12,
  body: 13,
  title: 14,
  subtitle: 16,
  display: 20,
  hero: 22
} as const;

export function tokensFor(mode: ThemeMode): ColorTokens {
  return mode === 'light' ? LIGHT_TOKENS : DARK_TOKENS;
}

// ── Colour math (used by the WCAG parity test and future token linting) ────

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(c => c + c)
          .join('')
      : clean;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two opaque colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Projection ────────────────────────────────────────────────────────────

/**
 * camelCase role → kebab-case CSS custom-property suffix.
 * `borderStrong → border-strong`, so roles project as `--cx-border-strong`
 * (the convention every stylesheet expects) rather than `--cx-borderStrong`.
 */
export function cssVarName(key: string): string {
  return key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
}

function toCssVars(colors: ColorTokens, density: DensityTokens, motion: MotionTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    vars[`--cx-${cssVarName(key)}`] = value;
  }
  vars['--cx-control-pad-y'] = `${density.controlPadY}px`;
  vars['--cx-control-pad-x'] = `${density.controlPadX}px`;
  vars['--cx-row-pad-y'] = `${density.rowPadY}px`;
  vars['--cx-row-pad-x'] = `${density.rowPadX}px`;
  vars['--cx-outer'] = `${density.outer}px`;
  vars['--cx-inner'] = `${density.inner}px`;
  vars['--cx-gap'] = `${density.gap}px`;
  vars['--cx-radius'] = `${density.radius}px`;
  vars['--cx-font-base'] = `${density.fontBase}px`;
  vars['--cx-font-small'] = `${density.fontSmall}px`;
  vars['--cx-line-height'] = String(density.lineHeight);
  vars['--cx-motion-fast'] = motion.fast;
  vars['--cx-motion-base'] = motion.base;
  vars['--cx-motion-slow'] = motion.slow;
  vars['--cx-motion-easing'] = motion.easing;
  return vars;
}

/**
 * Project resolved tokens onto a root element. Safe to call from a browser
 * effect; guards against non-DOM environments (SSR/tests).
 */
export function applyColorTokens(
  colors: ColorTokens,
  density: Density,
  mode: ThemeMode,
  root?: HTMLElement
): void {
  const el = root ?? (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (!el) return;

  const densityTokens = DENSITY_TOKENS[density];
  const vars = toCssVars(colors, densityTokens, MOTION);
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }
  el.dataset.theme = mode;
  el.dataset.density = density;
  el.style.colorScheme = mode;
  el.style.background = colors.bg;
  el.style.color = colors.text;
}

/** Convenience: apply the built-in palette for a mode. */
export function applyTokens(mode: ThemeMode, density: Density, root?: HTMLElement): void {
  applyColorTokens(tokensFor(mode), density, mode, root);
}
