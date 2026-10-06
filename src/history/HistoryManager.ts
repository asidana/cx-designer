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
}

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;

  /**
   * Record a change
   */
  record(flow: FlowGraph, description: string): void {
    // Remove any future history if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push({
      id: `hist_${Date.now()}`,
      flow: JSON.parse(JSON.stringify(flow)), // Deep clone
      description,
      timestamp: Date.now()
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
   * Clear history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Singleton instance
export const historyManager = new HistoryManager();
