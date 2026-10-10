/**
 * Side Menu — two levels.
 *
 * Level 1: the nine top-level sections (CX Designer, Guardrails, Voice
 * Gateway, Observability, Insights, Settings, Admin, Super Admin, Help).
 * Level 2: that section's own pages.
 *
 * The page column collapses to give the canvas the full width; the section
 * rail always stays so switching area is one click.
 */

import React from 'react';
import { SECTIONS, SectionDef } from '../navigation/navModel';

interface SideMenuProps {
  activeSection: string;
  activePage: string;
  onSectionChange: (id: string) => void;
  onPageChange: (id: string) => void;
  /** Page id → badge count (e.g. preflight issues). */
  badges?: Record<string, number>;
  pagesOpen: boolean;
  onTogglePages: () => void;
  status?: { flowName: string; nodeCount: number; dirty: boolean };
  onOpenCommandPalette: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  activeSection,
  activePage,
  onSectionChange,
  onPageChange,
  badges = {},
  pagesOpen,
  onTogglePages,
  status,
  onOpenCommandPalette
}) => {
  const section: SectionDef =
    SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];
  const activePageDef = section.pages.find(p => p.id === activePage) || section.pages[0];
  const sectionBadge = section.pages.reduce((n, p) => n + (badges[p.id] || 0), 0);

  return (
    <div style={{ display: 'flex', flex: '0 0 auto', minHeight: 0 }}>
      {/* Level 1 — sections */}
      <nav
        aria-label="Sections"
        style={{
          width: 68,
          flex: '0 0 68px',
          background: '#0d0d18',
          borderRight: `1px solid ${'#26263a'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          paddingTop: 8
        }}
      >
        {SECTIONS.map(s => {
          const active = s.id === activeSection;
          const badge = s.pages.reduce((n, p) => n + (badges[p.id] || 0), 0);
          return (
            <button
              key={s.id}
              onClick={() => {
                onSectionChange(s.id);
                if (!active) onPageChange(s.pages[0].id);
              }}
              title={`${s.label} — ${s.blurb}`}
              aria-current={active}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '9px 4px',
                border: 'none',
                borderLeft: active ? `2px solid ${'#6366f1'}` : '2px solid transparent',
                background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
                color: active ? '#fff' : '#8b8ba7',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
                {s.icon}
              </span>
              <span
                style={{
                  fontSize: 9,
                  lineHeight: 1.15,
                  textAlign: 'center',
                  fontWeight: active ? 600 : 400,
                  letterSpacing: 0.1
                }}
              >
                {s.label}
              </span>
              {badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 8,
                    background: '#f59e0b',
                    color: '#1a1a2e',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 999,
                    minWidth: 14,
                    padding: '0 4px'
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={onOpenCommandPalette}
          title="Command palette (Ctrl+K)"
          style={{
            border: 'none',
            background: 'transparent',
            color: '#6b6b85',
            cursor: 'pointer',
            padding: '10px 0 14px',
            fontSize: 14
          }}
        >
          ⌘
        </button>
      </nav>

      {/* Level 2 — pages of the active section */}
      {pagesOpen && (
        <nav
          aria-label={`${section.label} pages`}
          style={{
            width: 216,
            flex: '0 0 216px',
            background: '#12121f',
            borderRight: '1px solid #26263a',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #26263a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{section.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{section.label}</div>
                <div style={{ fontSize: 11, color: '#6b6b85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {section.blurb}
                </div>
              </div>
              <button
                onClick={onTogglePages}
                title="Collapse page list"
                aria-label="Collapse page list"
                style={{ background: 'transparent', border: 'none', color: '#6b6b85', cursor: 'pointer', fontSize: 13 }}
              >
                «
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
            {section.pages.map(page => {
              const active = page.id === activePage;
              const badge = badges[page.id];
              return (
                <button
                  key={page.id}
                  onClick={() => onPageChange(page.id)}
                  title={page.hint}
                  aria-current={active}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 2,
                    borderRadius: 6,
                    border: 'none',
                    background: active ? 'rgba(99,102,241,0.20)' : 'transparent',
                    color: active ? '#fff' : '#a5a5bd',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left'
                  }}
                >
                  <span aria-hidden style={{ width: 18, textAlign: 'center' }}>
                    {page.icon}
                  </span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {page.label}
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span style={badgeStyle}>{badge}</span>
                  )}
                  {page.shortcut && !badge && <span style={shortcutStyle}>{page.shortcut}</span>}
                </button>
              );
            })}
          </div>

          {status && section.id === 'designer' && (
            <div
              style={{
                borderTop: '1px solid #26263a',
                padding: '10px 14px',
                fontSize: 11,
                color: '#6b6b85',
                lineHeight: 1.6
              }}
            >
              <div style={{ color: '#c9c9dd', fontWeight: 600 }}>{status.flowName}</div>
              <div>
                {status.nodeCount} node{status.nodeCount === 1 ? '' : 's'} on canvas
              </div>
              <div style={{ color: status.dirty ? '#f59e0b' : '#10b981' }}>
                {status.dirty ? '● Unsaved changes' : '✓ All changes saved'}
              </div>
            </div>
          )}
          {sectionBadge > 0 && section.id !== 'designer' && (
            <div
              style={{
                borderTop: '1px solid #26263a',
                padding: '10px 14px',
                fontSize: 11,
                color: '#f59e0b'
              }}
            >
              {sectionBadge} issue{sectionBadge === 1 ? '' : 's'} need attention
            </div>
          )}
        </nav>
      )}

      {!pagesOpen && (
        <button
          onClick={onTogglePages}
          title="Show pages"
          aria-label="Show pages"
          style={{
            width: 22,
            flex: '0 0 22px',
            background: '#12121f',
            border: 'none',
            borderRight: '1px solid #26263a',
            color: '#6b6b85',
            cursor: 'pointer',
            fontSize: 12,
            writingMode: 'vertical-rl'
          }}
        >
          {activePageDef ? `${activePageDef.icon} ${activePageDef.label}  ›` : '›'}
        </button>
      )}
    </div>
  );
};

const shortcutStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#5f5f78',
  background: '#1d1d33',
  borderRadius: 3,
  padding: '1px 5px',
  fontFamily: 'monospace'
};

const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#1a1a2e',
  background: '#f59e0b',
  borderRadius: 999,
  padding: '0 6px',
  minWidth: 16,
  textAlign: 'center'
};