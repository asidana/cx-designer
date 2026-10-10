/**
 * Keyboard Shortcuts — global keyboard shortcuts
 *
 * Editing (canvas only):
 * - Ctrl+Z / Ctrl+Shift+Z: undo / redo
 * - Ctrl+S: save          - Ctrl+D: duplicate node
 * - Delete: delete selected        - Ctrl+A: select all
 * - Ctrl++ / Ctrl+- / Ctrl+0: zoom in / out / fit
 *
 * Navigation (anywhere, ignored while typing):
 * - Ctrl+K: command palette
 * - single letters and a few combos (see navigation/navModel PAGE_SHORTCUTS)
 */

import { useEffect } from 'react';
import { PAGE_SHORTCUTS } from '../navigation/navModel';

interface ShortcutHandler {
  /** Editing shortcuts only fire on the canvas. */
  enabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onCommandPalette: () => void;
  /** Normalized key (e.g. 'shift+y', 'shift+/') → page id, resolved by the caller. */
  onPageShortcut: (key: string) => void;
  onTogglePalette: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/** Normalize a keyboard event into the key form PAGE_SHORTCUTS uses. */
export function normalizeKey(e: KeyboardEvent): string {
  const key = e.key.toLowerCase();
  if (key === '/') return e.shiftKey ? 'shift+/' : '/';
  if (key === ',') return e.ctrlKey || e.metaKey ? 'mod+,' : ',';
  if (e.ctrlKey || e.metaKey) return `mod+${key}`;
  if (e.shiftKey && key.length === 1) return `shift+${key}`;
  return key;
}

export function useKeyboardShortcuts(handler: ShortcutHandler) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // ── Navigation: works everywhere ─────────────────────────────────
      if (ctrl && key === 'k') {
        e.preventDefault();
        handler.onCommandPalette();
        return;
      }

      if (!ctrl) {
        const normalized = normalizeKey(e);
        if (PAGE_SHORTCUTS[normalized]) {
          e.preventDefault();
          handler.onPageShortcut(normalized);
          return;
        }
        if (key === 'p' && handler.enabled) {
          e.preventDefault();
          handler.onTogglePalette();
          return;
        }
      }

      if (!handler.enabled) return;

      // ── Editing: canvas only ────────────────────────────────────────
      if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handler.onUndo();
        return;
      }

      if ((ctrl && key === 'z' && e.shiftKey) || (ctrl && key === 'y')) {
        e.preventDefault();
        handler.onRedo();
        return;
      }

      if (ctrl && key === 's') {
        e.preventDefault();
        handler.onSave();
        return;
      }

      if (ctrl && key === 'd') {
        e.preventDefault();
        handler.onDuplicate();
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        handler.onDelete();
        return;
      }

      if (ctrl && key === 'a') {
        e.preventDefault();
        handler.onSelectAll();
        return;
      }

      if (ctrl && (key === '=' || key === '+')) {
        e.preventDefault();
        handler.onZoomIn();
        return;
      }

      if (ctrl && key === '-') {
        e.preventDefault();
        handler.onZoomOut();
        return;
      }

      if (ctrl && key === '0') {
        e.preventDefault();
        handler.onResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handler]);
}