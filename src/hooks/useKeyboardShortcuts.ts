/**
 * Keyboard Shortcuts — global keyboard shortcuts
 * 
 * Shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z: Redo
 * - Ctrl+S: Save
 * - Ctrl+D: Duplicate node
 * - Delete: Delete selected
 * - Ctrl+A: Select all
 * - Space: Pan canvas
 * - Ctrl++: Zoom in
 * - Ctrl+-: Zoom out
 * - Ctrl+0: Reset zoom
 */

import { useEffect } from 'react';

interface ShortcutHandler {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function useKeyboardShortcuts(handler: ShortcutHandler) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handler.onUndo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((ctrl && key === 'z' && e.shiftKey) || (ctrl && key === 'y')) {
        e.preventDefault();
        handler.onRedo();
        return;
      }

      // Save: Ctrl+S
      if (ctrl && key === 's') {
        e.preventDefault();
        handler.onSave();
        return;
      }

      // Duplicate: Ctrl+D
      if (ctrl && key === 'd') {
        e.preventDefault();
        handler.onDuplicate();
        return;
      }

      // Delete: Delete or Backspace
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        handler.onDelete();
        return;
      }

      // Select all: Ctrl+A
      if (ctrl && key === 'a') {
        e.preventDefault();
        handler.onSelectAll();
        return;
      }

      // Zoom in: Ctrl++
      if (ctrl && (key === '=' || key === '+')) {
        e.preventDefault();
        handler.onZoomIn();
        return;
      }

      // Zoom out: Ctrl+-
      if (ctrl && key === '-') {
        e.preventDefault();
        handler.onZoomOut();
        return;
      }

      // Reset zoom: Ctrl+0
      if (ctrl && key === '0') {
        e.preventDefault();
        handler.onResetZoom();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handler]);
}
