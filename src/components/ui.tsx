/**
 * Shared UI primitives for the workspace pages.
 *
 * Every section page (Guardrails, Voice Gateway, Observability, Insights,
 * Admin, Super Admin, Help) composes from these so the app keeps one look
 * and pages stay short enough to stay correct.
 */

import React, { useState } from 'react';

export type ThemeMode = 'dark' | 'light';

const DARK = {
  bg: '#0f0f1a',
  panel: '#15152a',
  panel2: '#1a1a2e',
  border: '#2c2c44',
  text: '#e8e8f2',
  muted: '#8b8ba7',
  accent: '#6366f1',
  success: '#10b981',
  warn: '#f59e0b',
  danger: '#ef4449',
  input: '#0d0d18',
  code: '#0b0b14'
};

const LIGHT = {
  bg: '#f6f7fb',
  panel: '#ffffff',
  panel2: '#f1f2f8',
  border: '#d7d9e6',
  text: '#16182b',
  muted: '#5c6079',
  accent: '#4f46e5',
  success: '#059669',
  warn: '#b45309',
  danger: '#dc2626',
  input: '#ffffff',
  code: '#f7f8fc'
};

/**
 * Live theme object. Components read `theme.x` during render, so mutating it
 * in place and re-rendering the shell switches the whole workspace.
 */
export const theme: typeof DARK = { ...DARK };

export function setThemeMode(mode: ThemeMode): void {
  Object.assign(theme, mode === 'light' ? LIGHT : DARK);
  document.documentElement.style.background = mode === 'light' ? LIGHT.bg : DARK.bg;
}

export const Page: React.FC<{
  title: string;
  hint?: string;
  icon?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, hint, icon, actions, children }) => (
  <div style={{ height: '100%', overflowY: 'auto', padding: '20px 24px 40px' }}>
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
        <h1 style={{ margin: 0, fontSize: 20, color: theme.text }}>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          {title}
        </h1>
        {hint && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: theme.muted, maxWidth: 720 }}>
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
      borderRadius: 10,
      padding: 16,
      marginBottom: 14,
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
            <h2 style={{ margin: 0, fontSize: 14, color: theme.text }}>{title}</h2>
          )}
          {hint && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.muted }}>{hint}</p>
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
        borderRadius: 8,
        padding: '12px 14px'
      }}
    >
      <div style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color, marginTop: 6 }}>{value}</div>
      {sub !== undefined && (
        <div style={{ fontSize: 11, color: theme.muted, marginTop: 4 }}>{sub}</div>
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
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}> = ({ children, onClick, tone = 'default', size = 'md', disabled, title, type = 'button', style }) => {
  const colors: Record<string, string> = {
    default: theme.panel2,
    primary: theme.accent,
    good: theme.success,
    danger: 'transparent',
    ghost: 'transparent'
  };
  const fg = tone === 'danger' ? theme.danger : tone === 'ghost' ? theme.muted : '#fff';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...style,
        padding: size === 'sm' ? '5px 10px' : '8px 14px',
        borderRadius: 6,
        border: tone === 'danger' || tone === 'ghost' ? `1px solid ${theme.border}` : 'none',
        background: colors[tone],
        color: fg,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: size === 'sm' ? 12 : 13,
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
    <span style={{ display: 'block', fontSize: 12, color: theme.muted, marginBottom: 5 }}>
      {label}
    </span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: 11, color: '#5f5f78', marginTop: 4 }}>{hint}</span>}
  </label>
);

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: `1px solid ${theme.border}`,
  background: theme.input,
  color: theme.text,
  fontSize: 13,
  fontFamily: 'inherit'
};

export const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={inputStyle}
  />
);

export const Textarea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}> = ({ value, onChange, rows = 6, placeholder, mono }) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={{
      ...inputStyle,
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
}> = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
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
}> = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    {label && <span style={{ fontSize: 13 }}>{label}</span>}
  </label>
);

export const Table: React.FC<{
  columns: string[];
  children: React.ReactNode;
  empty?: string;
}> = ({ columns, children, empty }) => {
  const rows = React.Children.count(children);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th
                key={c}
                style={{
                  textAlign: 'left',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  color: theme.muted,
                  padding: '6px 10px',
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
        <div style={{ padding: '14px 10px', fontSize: 12, color: '#5f5f78' }}>
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
      padding: '8px 10px',
      borderBottom: '1px solid rgba(44,44,68,0.5)',
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
            ? '#38bdf8'
            : theme.muted;
  return (
    <span
      style={{
        fontSize: 11,
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
      color: '#5f5f78',
      fontSize: 13,
      border: `1px dashed ${theme.border}`,
      borderRadius: 8
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
      gap: 12
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
}> = ({ data, tone = theme.accent, max }) => {
  const peak = max ?? Math.max(1, ...data.map(d => d.value));
  if (data.length === 0) return <Empty>No data yet.</Empty>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 90px', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: theme.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <span style={{ fontSize: 12, color: theme.text, textAlign: 'right' }}>
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
}> = ({ label, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <Button size="sm" tone="ghost" onClick={() => setOpen(o => !o)}>
        {open ? '▾' : '▸'} {label}
      </Button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
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
      borderRadius: 8,
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#cbd5e1',
      overflowX: 'auto',
      maxHeight: 280
    }}
  >
    {JSON.stringify(value, null, 2)}
  </pre>
);