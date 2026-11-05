/**
 * Shared UI primitives for the workspace pages.
 *
 * Every section page (Guardrails, Voice Gateway, Observability, Insights,
 * Admin, Super Admin, Help) composes from these so the app keeps one look
 * and pages stay short enough to stay correct.
 */

import React, { useState } from 'react';
import { density, theme } from '../design/themeRuntime';

/**
 * Live token objects + controls. Re-exported from `design/themeRuntime` so
 * existing pages keep importing from `./ui` while the runtime owns state.
 */
export { theme, density };
export { setThemeMode, setDensity, getThemeMode, getDensity } from '../design/themeRuntime';
export type { ThemeMode, Density } from '../design/tokens';
import { TYPE_SCALE } from '../design/tokens';
export { TYPE_SCALE };

/**
 * Overlay layer scale — one ordered scale instead of ad-hoc z-indexes:
 * canvas chrome < last-run < panels < palette < drawers < toasts.
 */
export const Z = {
  minimap: 5,
  canvasToolbar: 10,
  lastRun: 20,
  analytics: 50,
  panel: 100,
  palette: 300,
  drawer: 900,
  toast: 1000
} as const;

export const Page: React.FC<{
  title: string;
  hint?: string;
  icon?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, hint, icon, actions, children }) => (
  <div style={{ height: '100%', overflowY: 'auto', padding: `${density.outer}px 24px 40px` }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 18
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: TYPE_SCALE.display, color: theme.text }}>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          {title}
        </h1>
        {hint && (
          <p style={{ margin: '6px 0 0', fontSize: TYPE_SCALE.body, color: theme.muted, maxWidth: 720 }}>
            {hint}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
    {children}
  </div>
);

export const Card: React.FC<{
  title?: string;
  hint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, hint, actions, children, style }) => (
  <section
    style={{
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      borderRadius: density.radius + 2,
      padding: density.inner,
      marginBottom: density.gap + 2,
      ...style
    }}
  >
    {(title || actions) && (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          gap: 12
        }}
      >
        <div>
          {title && (
            <h2 style={{ margin: 0, fontSize: TYPE_SCALE.title, color: theme.text }}>{title}</h2>
          )}
          {hint && (
            <p style={{ margin: '4px 0 0', fontSize: TYPE_SCALE.small, color: theme.muted }}>{hint}</p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}> = ({ label, value, sub, tone = 'default' }) => {
  const color =
    tone === 'good'
      ? theme.success
      : tone === 'warn'
        ? theme.warn
        : tone === 'bad'
          ? theme.danger
          : theme.text;
  return (
    <div
      style={{
        flex: '1 1 160px',
        background: theme.panel2,
        border: `1px solid ${theme.border}`,
        borderRadius: density.radius,
        padding: '12px 14px'
      }}
    >
      <div style={{ fontSize: TYPE_SCALE.caption, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: TYPE_SCALE.hero, fontWeight: 600, color, marginTop: 6 }}>{value}</div>
      {sub !== undefined && (
        <div style={{ fontSize: TYPE_SCALE.caption, color: theme.muted, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
};

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'primary' | 'good' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  buttonRef?: React.Ref<HTMLButtonElement>;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}> = ({ children, onClick, tone = 'default', size = 'md', disabled, title, ariaLabel, ariaExpanded, ariaControls, buttonRef, type = 'button', style }) => {
  const colors: Record<string, string> = {
    default: theme.panel2,
    primary: theme.accent,
    good: theme.success,
    danger: 'transparent',
    ghost: 'transparent'
  };
  const fg =
    tone === 'default'
      ? theme.text
      : tone === 'danger'
        ? theme.danger
        : tone === 'ghost'
          ? theme.muted
          : theme.accentContrast;
  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      style={{
        ...style,
        padding:
          size === 'sm'
            ? `${Math.max(3, density.controlPadY - 3)}px ${Math.max(7, density.controlPadX - 4)}px`
            : `${density.controlPadY}px ${density.controlPadX}px`,
        borderRadius: density.radius,
        border: tone === 'danger' || tone === 'ghost' ? `1px solid ${theme.border}` : 'none',
        background: colors[tone],
        color: fg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: size === 'sm' ? TYPE_SCALE.small : TYPE_SCALE.body,
        fontWeight: tone === 'primary' || tone === 'good' ? 600 : 500
      }}
    >
      {children}
    </button>
  );
};

export const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ label, hint, children, style }) => (
  <label style={{ display: 'block', ...style }}>
    <span style={{ display: 'block', fontSize: TYPE_SCALE.small, color: theme.muted, marginBottom: 5 }}>
      {label}
    </span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: TYPE_SCALE.caption, color: theme.subtle, marginTop: 4 }}>{hint}</span>}
  </label>
);

export function getInputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.input,
    color: theme.text,
    fontSize: TYPE_SCALE.body,
    fontFamily: 'inherit'
  };
}

/** @deprecated Use getInputStyle() so theme toggles apply without reload. */
export const inputStyle: React.CSSProperties = getInputStyle();

export const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  min?: number;
  max?: number;
  step?: number;
}> = ({ value, onChange, placeholder, type = 'text', id, ariaLabel, ariaDescribedBy, ariaInvalid, min, max, step }) => (
  <input
    id={id}
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-invalid={ariaInvalid}
    min={min}
    max={max}
    step={step}
    style={getInputStyle()}
  />
);

export const Textarea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}> = ({ value, onChange, rows = 6, placeholder, mono, id, ariaLabel, ariaDescribedBy, ariaInvalid }) => (
  <textarea
    id={id}
    value={value}
    rows={rows}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-invalid={ariaInvalid}
    style={{
      ...getInputStyle(),
      resize: 'vertical',
      fontFamily: mono ? 'monospace' : 'inherit',
      fontSize: mono ? 12 : 13
    }}
  />
);

export const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
}> = ({ value, onChange, options, id, ariaLabel, ariaDescribedBy, ariaInvalid }) => (
  <select
    id={id}
    value={value}
    onChange={e => onChange(e.target.value)}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-invalid={ariaInvalid}
    style={getInputStyle()}
  >
    {options.map(o => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  ariaLabel?: string;
}> = ({ checked, onChange, label, ariaLabel }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      aria-label={ariaLabel ?? label}
    />
    {label && <span style={{ fontSize: TYPE_SCALE.body }}>{label}</span>}
  </label>
);

export const Table: React.FC<{
  columns: string[];
  children: React.ReactNode;
  empty?: string;
  caption?: string;
}> = ({ columns, children, empty, caption }) => {
  const rows = React.Children.count(children);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: TYPE_SCALE.body }}>
        {caption && <caption style={{ textAlign: 'left', fontSize: 12, color: theme.muted, paddingBottom: 6 }}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map(c => (
              <th
                key={c}
                scope="col"
                style={{
                  textAlign: 'left',
                  fontSize: TYPE_SCALE.caption,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: theme.muted,
                  padding: `${Math.max(2, density.rowPadY - 2)}px ${density.rowPadX}px`,
                  borderBottom: `1px solid ${theme.border}`,
                  whiteSpace: 'nowrap'
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {rows === 0 && (
        <div style={{ padding: `14px ${density.rowPadX}px`, fontSize: TYPE_SCALE.small, color: theme.subtle }}>
          {empty || 'Nothing here yet.'}
        </div>
      )}
    </div>
  );
};

export const Td: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style
}) => (
  <td
    style={{
      padding: `${density.rowPadY}px ${density.rowPadX}px`,
      borderBottom: `1px solid ${theme.border}`,
      color: theme.text,
      verticalAlign: 'top',
      ...style
    }}
  >
    {children}
  </td>
);

export const Pill: React.FC<{ children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'muted' | 'info' }> = ({
  children,
  tone = 'muted'
}) => {
  const color =
    tone === 'good'
      ? theme.success
      : tone === 'warn'
        ? theme.warn
        : tone === 'bad'
          ? theme.danger
          : tone === 'info'
            ? theme.info
            : theme.muted;
  return (
    <span
      style={{
        fontSize: TYPE_SCALE.caption,
        color,
        border: `1px solid ${color}55`,
        background: `${color}14`,
        borderRadius: 999,
        padding: '1px 8px',
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </span>
  );
};

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      padding: '22px 16px',
      textAlign: 'center',
      color: theme.subtle,
      fontSize: TYPE_SCALE.body,
      border: `1px dashed ${theme.border}`,
      borderRadius: density.radius
    }}
  >
    {children}
  </div>
);

/** Small two-column layout used by config-style forms. */
export const Grid: React.FC<{ children: React.ReactNode; min?: number }> = ({ children, min = 220 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      gap: density.gap
    }}
  >
    {children}
  </div>
);

/** Horizontal bar chart from values — used for latency/cost breakdowns. */
export const Bars: React.FC<{
  data: Array<{ label: string; value: number; display?: string }>;
  tone?: string;
  max?: number;
  ariaLabel?: string;
}> = ({ data, tone = theme.accent, max, ariaLabel = 'Bar chart' }) => {
  const peak = max ?? Math.max(1, ...data.map(d => d.value));
  if (data.length === 0) return <Empty>No data yet.</Empty>;
  const textSummary = data.map(d => `${d.label}: ${d.display ?? d.value.toFixed(0)}`).join(', ');
  return (
    <div role="img" aria-label={`${ariaLabel}. ${textSummary}`} style={{ display: 'grid', gap: 8 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 90px', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: TYPE_SCALE.small, color: theme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.label}
          </span>
          <span style={{ background: theme.input, borderRadius: 4, height: 12, overflow: 'hidden' }}>
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.max(2, (d.value / peak) * 100)}%`,
                background: tone
              }}
            />
          </span>
          <span style={{ fontSize: TYPE_SCALE.small, color: theme.text, textAlign: 'right' }}>
            {d.display ?? d.value.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Accordion-ish inline editor that keeps list pages short. */
export const Collapsible: React.FC<{
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
}> = ({ label, children, defaultOpen = false, id }) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = id ?? `collapsible-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <Button size="sm" tone="ghost" onClick={() => setOpen(o => !o)} ariaExpanded={open} ariaControls={panelId}>
        {open ? '▾' : '▸'} {label}
      </Button>
      {open && (
        <div id={panelId} style={{ marginTop: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
};

/** JSON pretty-printer for state/config readbacks. */
export const Code: React.FC<{ value: unknown }> = ({ value }) => (
  <pre
    style={{
      margin: 0,
      padding: 12,
      background: theme.code,
      border: `1px solid ${theme.border}`,
      borderRadius: density.radius,
      fontSize: TYPE_SCALE.small,
      fontFamily: 'monospace',
      color: theme.text,
      overflowX: 'auto',
      maxHeight: 280
    }}
  >
    {JSON.stringify(value, null, 2)}
  </pre>
);