/**
 * Command Palette (Ctrl+K)
 *
 * One keyboard path to everything: panels, canvas actions, node types.
 * Ranking lives in `navigation/search.ts` so it stays testable.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { groupHits, searchItems } from '../navigation/search';

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: string;
  hint?: string;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  commands,
  onClose,
  placeholder = 'Search commands and nodes…'
}) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Focus after paint so the dialog is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const groups = useMemo(() => {
    const flat = searchItems(query, commands, 60);
    setCursor(0);
    return groupHits(flat);
  }, [query, commands]);

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(c => (c + 1) % Math.max(1, flat.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(c => (c - 1 + Math.max(1, flat.length)) % Math.max(1, flat.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = flat[cursor];
        if (cmd) {
          onClose();
          cmd.run();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flat, cursor, onClose]);

  // Keep the highlighted row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [cursor, groups]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(6, 6, 12, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
        style={{
          width: 'min(680px, 92vw)',
          background: '#12121f',
          border: '1px solid #33334d',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh'
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          placeholder={placeholder}
          aria-label="Command search"
          style={{
            padding: '14px 18px',
            border: 'none',
            borderBottom: '1px solid #26263a',
            background: 'transparent',
            color: '#fff',
            fontSize: 15,
            outline: 'none'
          }}
        />

        <div ref={listRef} style={{ overflowY: 'auto', padding: '6px 0' }}>
          {flat.length === 0 && (
            <div style={{ padding: '20px 18px', color: '#6b6b85', fontSize: 13 }}>
              No commands match “{query}”.
            </div>
          )}
          {groups.map(group => (
            <div key={group.group}>
              <div
                style={{
                  padding: '8px 18px 4px',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: '#5f5f78'
                }}
              >
                {group.group}
              </div>
              {group.items.map(cmd => {
                const index = flat.indexOf(cmd);
                const active = index === cursor;
                return (
                  <button
                    key={cmd.id}
                    data-active={active}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      onClose();
                      cmd.run();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '9px 18px',
                      border: 'none',
                      background: active ? 'rgba(99,102,241,0.22)' : 'transparent',
                      color: active ? '#fff' : '#c9c9dd',
                      cursor: 'pointer',
                      fontSize: 13,
                      textAlign: 'left'
                    }}
                  >
                    {cmd.icon && <span aria-hidden>{cmd.icon}</span>}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block' }}>{cmd.label}</span>
                      {cmd.hint && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 11,
                            color: '#6b6b85',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {cmd.hint}
                        </span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#5f5f78',
                          background: '#1d1d33',
                          borderRadius: 3,
                          padding: '2px 6px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            padding: '8px 18px',
            borderTop: '1px solid #26263a',
            fontSize: 11,
            color: '#5f5f78'
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
          <span style={{ marginLeft: 'auto' }}>{flat.length} result{flat.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
};