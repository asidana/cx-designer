/**
 * History Manager — undo/redo support
 * 
 * Tracks all changes to the flow and allows undo/redo.
 */

import { FlowGraph } from '../types/node';

export interface HistoryEntry {
  id: string;
  flow: FlowGraph;
  description: string;
  timestamp: number;
  coalesceKey?: string;
}

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;

  /**
   * Record a change.
   *
   * Pass `coalesceKey` for high-frequency edits (config keystrokes, drags):
   * repeats with the same key inside `coalesceWindowMs` overwrite the last
   * entry instead of flooding the stack.
   */
  record(flow: FlowGraph, description: string, opts?: { coalesceKey?: string; coalesceWindowMs?: number }): void {
    if (opts?.coalesceKey && this.history.length > 0) {
      const last = this.history[this.currentIndex];
      const windowMs = opts.coalesceWindowMs ?? 1500;
      if (
        last &&
        last.coalesceKey === opts.coalesceKey &&
        Date.now() - last.timestamp < windowMs
      ) {
        last.flow = JSON.parse(JSON.stringify(flow));
        last.timestamp = Date.now();
        last.description = description;
        return;
      }
    }
    // Remove any future history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push({
      id: `hist_${Date.now()}`,
      flow: JSON.parse(JSON.stringify(flow)), // Deep clone
      description,
      timestamp: Date.now(),
      coalesceKey: opts?.coalesceKey
    });

    // Trim to max history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Undo the last change
   */
  undo(): FlowGraph | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex].flow));
    }
    return null;
  }

  /**
   * Redo the next change
   */
  redo(): FlowGraph | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex].flow));
    }
    return null;
  }

  /**
   * Can undo?
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Can redo?
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current state
   */
  getCurrent(): FlowGraph | null {
    if (this.currentIndex >= 0) {
      return JSON.parse(JSON.stringify(this.history[this.currentIndex].flow));
    }
    return null;
  }

  /**
   * Get history list
   */
  getHistory(): Array<{ description: string; timestamp: number; isCurrent: boolean }> {
    return this.history.map((entry, index) => ({
      description: entry.description,
      timestamp: entry.timestamp,
      isCurrent: index === this.currentIndex
    }));
  }

  /**
   * Reset history with an explicit baseline (e.g. the flow as loaded).
   * Subsequent records then undo back to this baseline instead of
   * getting stuck at the first recorded state.
   */
  reset(flow: FlowGraph, description = 'baseline'): void {
    this.history = [
      {
        id: `hist_${Date.now()}`,
        flow: JSON.parse(JSON.stringify(flow)),
        description,
        timestamp: Date.now()
      }
    ];
    this.currentIndex = 0;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Singleton instance
export const historyManager = new HistoryManager();
