/**
 * Interaction-state contract.
 *
 * Every data surface in the platform has to answer the same seven questions
 * before it is allowed to ship: what does it show while **loading**, when
 * there is **no data**, when it **errors**, when it has **partial** data,
 * when the data is **stale**, when the user is **not permitted**, and how an
 * **optimistic** update is confirmed or rolled back.
 *
 * These components are the single answer to those questions. A page that
 * needs a state renders it from here rather than inventing its own spinner,
 * empty box or error string — that is what keeps the product consistent and
 * testable.
 *
 * Accessibility is built in: status regions are `aria-live`, states carry a
 * text label as well as an icon/tone (never colour alone), and retries are
 * real buttons in the tab order.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { theme, density, Button, Card, TYPE_SCALE } from './ui';
/**
 * Local stand-ins for the platform's rbac/workspace identity types so the
 * state components stay self-contained. A host application can re-brand
 * these without touching the components.
 */
export type Permission = string;
export type Role = string;

type Tone = 'muted' | 'good' | 'warn' | 'bad' | 'info';

function toneColor(tone: Tone): string {
  switch (tone) {
    case 'good':
      return theme.success;
    case 'warn':
      return theme.warn;
    case 'bad':
      return theme.danger;
    case 'info':
      return theme.info;
    default:
      return theme.muted;
  }
}

/** Screen-reader-only copy of a status change. */
export const LiveRegion: React.FC<{ children: React.ReactNode; assertive?: boolean }> = ({
  children,
  assertive
}) => (
  <span
    role="status"
    aria-live={assertive ? 'assertive' : 'polite'}
    style={{
      position: 'absolute',
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
      border: 0
    }}
  >
    {children}
  </span>
);

// ── Loading ───────────────────────────────────────────────────────────────

export const Skeleton: React.FC<{ width?: number | string; height?: number; radius?: number }> = ({
  width = '100%',
  height = 12,
  radius = 4
}) => (
  <span
    aria-hidden
    style={{
      display: 'block',
      width,
      height,
      borderRadius: radius,
      background: `linear-gradient(90deg, ${theme.panel2} 25%, ${theme.border} 37%, ${theme.panel2} 63%)`,
      backgroundSize: '400% 100%',
      animation: 'cx-shimmer 1.4s ease infinite'
    }}
  />
);

export const LoadingState: React.FC<{ label?: string; rows?: number }> = ({
  label = 'Loading…',
  rows = 4
}) => (
  <div role="status" aria-busy="true" aria-label={label} style={{ display: 'grid', gap: 10 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} height={14} width={i % 2 ? '65%' : '100%'} />
    ))}
  </div>
);

// ── Empty / partial / error ───────────────────────────────────────────────

export const EmptyState: React.FC<{
  icon?: string;
  title?: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ icon = '🗂️', title = 'Nothing here yet', hint, action }) => (
  <div
    style={{
      padding: '26px 18px',
      textAlign: 'center',
      border: `1px dashed ${theme.border}`,
      borderRadius: density.radius,
      background: theme.panel
    }}
  >
    <div aria-hidden style={{ fontSize: 30, marginBottom: 8 }}>
      {icon}
    </div>
    <div style={{ fontSize: TYPE_SCALE.title, color: theme.text, fontWeight: 600 }}>{title}</div>
    {hint && (
      <p style={{ fontSize: TYPE_SCALE.small, color: theme.muted, margin: '6px auto 0', maxWidth: 420, lineHeight: 1.6 }}>
        {hint}
      </p>
    )}
    {action && <div style={{ marginTop: 14 }}>{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => (
  <Card style={{ borderColor: theme.danger }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span aria-hidden style={{ fontSize: 22, color: theme.danger }}>
        ⚠
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: TYPE_SCALE.title, color: theme.text }}>{title}</strong>
          <span style={{ fontSize: 11, color: theme.danger, border: `1px solid ${theme.danger}55`, borderRadius: 999, padding: '0 8px' }}>
            error
          </span>
        </div>
        {message && (
          <p style={{ fontSize: TYPE_SCALE.small, color: theme.muted, margin: '6px 0 0', lineHeight: 1.6 }}>
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          ⟳ Retry
        </Button>
      )}
    </div>
  </Card>
);

export const PartialState: React.FC<{
  loaded: number;
  total: number;
  note?: string;
  onRetry?: () => void;
}> = ({ loaded, total, note, onRetry }) => (
  <div
    role="status"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      padding: '8px 12px',
      borderRadius: density.radius,
      border: `1px solid ${theme.warn}55`,
      background: `${theme.warn}14`,
      fontSize: TYPE_SCALE.small,
      color: theme.text
    }}
  >
    <span aria-hidden>◐</span>
    <span>
      Showing <strong>{loaded}</strong> of <strong>{total}</strong> — some data could not be loaded.
    </span>
    {note && <span style={{ color: theme.muted }}>{note}</span>}
    {onRetry && (
      <Button size="sm" tone="ghost" onClick={onRetry}>
        ⟳ Load the rest
      </Button>
    )}
  </div>
);

export const StaleBadge: React.FC<{ since?: number; onRefresh?: () => void }> = ({
  since,
  onRefresh
}) => {
  const when = since ? new Date(since).toLocaleTimeString() : null;
  return (
    <div
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11.5,
        color: theme.warn,
        border: `1px solid ${theme.warn}55`,
        background: `${theme.warn}14`,
        borderRadius: 999,
        padding: '2px 10px'
      }}
    >
      <span aria-hidden>↻</span>
      <span>Stale{when ? ` — last updated ${when}` : ''}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{ background: 'transparent', border: 'none', color: theme.warn, cursor: 'pointer', fontSize: 11.5, textDecoration: 'underline' }}
        >
          refresh
        </button>
      )}
    </div>
  );
};

export const PermissionDenied: React.FC<{ permission: Permission; role?: Role }> = ({
  permission,
  role
}) => (
  <div
    role="alert"
    style={{
      padding: '24px 18px',
      textAlign: 'center',
      border: `1px solid ${theme.border}`,
      borderRadius: density.radius,
      background: theme.panel
    }}
  >
    <div aria-hidden style={{ fontSize: 28, marginBottom: 8 }}>
      🔒
    </div>
    <div style={{ fontSize: TYPE_SCALE.title, fontWeight: 600, color: theme.text }}>You don’t have access</div>
    <p style={{ fontSize: TYPE_SCALE.small, color: theme.muted, margin: '6px auto 0', maxWidth: 460, lineHeight: 1.6 }}>
      {role ? `The ${role} role` : 'Your role'} does not grant the <code>{permission}</code>{' '}
      permission. Ask an administrator if you need it.
    </p>
  </div>
);

// ── Error boundary ────────────────────────────────────────────────────────

interface BoundaryProps {
  children: React.ReactNode;
  /** Label used in the audit/console message. */
  scope?: string;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  fallback?: (reset: () => void, error: Error) => React.ReactNode;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Catches render errors so one broken page cannot take down the shell — the
 * spec's "the rest of the app must survive a failed section" rule.
 */
export class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(`[${this.props.scope ?? 'ui'}] render error`, error, info);
    this.props.onError?.(error, info);
  }

  reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);
    return (
      <div style={{ padding: 20 }}>
        <ErrorState
          title={`This ${this.props.scope ?? 'view'} failed to render`}
          message={error.message}
          onRetry={this.reset}
        />
      </div>
    );
  }
}

// ── Async data hook (loading → ready | empty | error, with staleness) ──────

export interface AsyncResult<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
  error: Error | null;
  /** A reload is in flight while previous data is still shown. */
  stale: boolean;
  reload: () => void;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList
): AsyncResult<T> {
  const [status, setStatus] = useState<AsyncResult<T>['status']>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [stale, setStale] = useState(false);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let live = true;
    setError(null);
    if (data === null) setStatus('loading');
    else setStale(true);
    loaderRef
      .current()
      .then(result => {
        if (!live) return;
        setData(result);
        setStatus('ready');
        setStale(false);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
        setStale(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return { status, data, error, stale, reload };
}

// ── StateView — the contract as one switch ────────────────────────────────

export type ViewState =
  | { kind: 'loading'; label?: string }
  | { kind: 'ready' }
  | { kind: 'empty'; icon?: string; title?: string; hint?: string; action?: React.ReactNode }
  | { kind: 'error'; title?: string; message?: string; onRetry?: () => void }
  | { kind: 'partial'; loaded: number; total: number; onRetry?: () => void; note?: string }
  | { kind: 'stale'; since?: number; onRefresh?: () => void }
  | { kind: 'denied'; permission: Permission; role?: Role };

export const StateView: React.FC<{ state: ViewState; children?: React.ReactNode }> = ({
  state,
  children
}) => {
  switch (state.kind) {
    case 'loading':
      return <LoadingState label={state.label} />;
    case 'empty':
      return (
        <EmptyState icon={state.icon} title={state.title} hint={state.hint} action={state.action} />
      );
    case 'error':
      return <ErrorState title={state.title} message={state.message} onRetry={state.onRetry} />;
    case 'partial':
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          <PartialState loaded={state.loaded} total={state.total} note={state.note} onRetry={state.onRetry} />
          {children}
        </div>
      );
    case 'stale':
      return (
        <div style={{ display: 'grid', gap: 12 }}>
          <StaleBadge since={state.since} onRefresh={state.onRefresh} />
          {children}
        </div>
      );
    case 'denied':
      return <PermissionDenied permission={state.permission} role={state.role} />;
    case 'ready':
    default:
      return <>{children}</>;
  }
};

/** Convenience: tone for a status pill from an async status. */
export function statusTone(status: AsyncResult<unknown>['status']): 'muted' | 'good' | 'bad' {
  if (status === 'ready') return 'good';
  if (status === 'error') return 'bad';
  return 'muted';
}

export { toneColor };
