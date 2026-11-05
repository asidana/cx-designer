/**
 * Auto Save — automatically save flow changes
 * 
 * Features:
 * - Debounced auto-save
 * - Local-first persistence via src/storage/local.ts (IndexedDB durable,
 *   localStorage boot cache)
 * - Recovery on crash
 * - Save status indicator
 */

import { FlowGraph } from '../types/node';
import { getSync, hydrate, remove as storageRemove, set as storageSet } from '../storage/local';

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxBackups: number;
  /** Minimum gap between recovery points, so frequent autosaves don't churn them. */
  backupIntervalMs: number;
}

export interface SaveStatus {
  lastSaved: number | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  backupCount: number;
}

/** Where a restored session came from, so the caller can message accordingly. */
export type RestoreSource = 'cache' | 'durable' | 'backup';

export interface RestoredSession {
  flow: FlowGraph;
  source: RestoreSource;
}

const STORAGE_KEY = 'agentic_cx_designer_autosave';
const BACKUP_KEY = 'agentic_cx_designer_backups';

/** A minimal shape guard — a corrupt/foreign payload must not crash boot. */
function isFlowGraphish(value: unknown): value is FlowGraph {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as FlowGraph).nodes) &&
    Array.isArray((value as FlowGraph).edges)
  );
}

export class AutoSave {
  private config: AutoSaveConfig;
  private flow: FlowGraph | null = null;
  private lastSavedFlow: string = '';
  private lastBackupAt = 0;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private status: SaveStatus = {
    lastSaved: null,
    isSaving: false,
    hasUnsavedChanges: false,
    backupCount: 0
  };
  /** Listeners told when a flow is actually persisted, so the shell can mark it clean. */
  private savedListeners = new Set<(flow: FlowGraph) => void>();

  constructor(config: Partial<AutoSaveConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      maxBackups: config.maxBackups ?? 10,
      backupIntervalMs: config.backupIntervalMs ?? 30000
    };
  }

  /**
   * Adopt the shell's live settings (auto-save toggle + interval). Called when
   * the settings page changes them, so the toggle is honoured, not cosmetic.
   */
  configure(partial: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...partial };
    if (!this.config.enabled && this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Subscribe to successful saves. Returns an unsubscribe function.
   * The saved flow is passed so the caller can fingerprint exactly what landed.
   */
  onSaved(listener: (flow: FlowGraph) => void): () => void {
    this.savedListeners.add(listener);
    return () => {
      this.savedListeners.delete(listener);
    };
  }

  private notifySaved(flow: FlowGraph): void {
    this.savedListeners.forEach(listener => listener(flow));
  }

  /**
   * Update the flow (triggers auto-save)
   */
  update(flow: FlowGraph): void {
    this.flow = flow;
    this.status.hasUnsavedChanges = true;

    if (!this.config.enabled) return;

    // Debounce save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.save();
    }, this.config.intervalMs);
  }

  /**
   * Save the flow
   */
  save(): void {
    if (!this.flow) return;

    this.status.isSaving = true;

    try {
      const flowJSON = JSON.stringify(this.flow);
      const savedFlow = this.flow;
      
      // Check if actually changed
      if (flowJSON === this.lastSavedFlow) {
        this.status.isSaving = false;
        this.status.hasUnsavedChanges = false;
        this.notifySaved(savedFlow);
        return;
      }

      // Save to the local-first store
      storageSet(STORAGE_KEY, this.flow);
      
      // Create backup
      this.createBackup(flowJSON);

      this.lastSavedFlow = flowJSON;
      this.status.lastSaved = Date.now();
      this.status.hasUnsavedChanges = false;
      this.notifySaved(savedFlow);
    } catch (error) {
      console.error('[AutoSave] Save failed:', error);
    } finally {
      this.status.isSaving = false;
    }
  }

  /**
   * Create a backup, rate-limited so a fast autosave loop doesn't fill the
   * recovery ring with near-identical snapshots.
   */
  private createBackup(flowJSON: string): void {
    try {
      const now = Date.now();
      const backups = this.getBackups();
      if (backups.length > 0 && now - this.lastBackupAt < this.config.backupIntervalMs) {
        this.status.backupCount = backups.length;
        return;
      }

      backups.unshift({ timestamp: now, flow: flowJSON });

      // Trim to max backups
      while (backups.length > this.config.maxBackups) {
        backups.pop();
      }

      storageSet(BACKUP_KEY, backups);
      this.lastBackupAt = now;
      this.status.backupCount = backups.length;
    } catch (error) {
      console.error('[AutoSave] Backup failed:', error);
    }
  }

  /**
   * Get all backups
   */
  getBackups(): Array<{ timestamp: number; flow: string }> {
    return getSync<Array<{ timestamp: number; flow: string }>>(BACKUP_KEY, []);
  }

  /**
   * Restore from auto-save (boot cache only).
   */
  restore(): FlowGraph | null {
    const flow = getSync<unknown>(STORAGE_KEY, null);
    if (isFlowGraphish(flow)) {
      this.flow = flow;
      this.lastSavedFlow = JSON.stringify(flow);
      return flow;
    }
    return null;
  }

  /**
   * Restore the most recent session, most-authoritative source first:
   *
   *   1. the localStorage boot cache (synchronous, keeps first paint honest)
   *   2. the durable IndexedDB store (cache evicted / cleared)
   *   3. the newest recovery backup (the crash path)
   *
   * Returns null when there is genuinely nothing to restore. The caller
   * normalizes the result — restoring is an ingress like any other.
   */
  async restoreLatest(): Promise<RestoredSession | null> {
    const cached = this.restore();
    if (cached) return { flow: cached, source: 'cache' };

    const durable = await hydrate<unknown>(STORAGE_KEY);
    if (isFlowGraphish(durable)) {
      this.flow = durable;
      this.lastSavedFlow = JSON.stringify(durable);
      return { flow: durable, source: 'durable' };
    }

    const backups = this.getBackups();
    if (backups.length > 0) {
      const recovered = this.restoreBackup(backups[0].timestamp);
      if (recovered) return { flow: recovered, source: 'backup' };
    }

    return null;
  }

  /**
   * Restore from a specific backup
   */
  restoreBackup(timestamp: number): FlowGraph | null {
    const backups = this.getBackups();
    const backup = backups.find(b => b.timestamp === timestamp);
    
    if (backup) {
      try {
        const parsed = JSON.parse(backup.flow) as unknown;
        if (!isFlowGraphish(parsed)) return null;
        this.flow = parsed;
        this.lastSavedFlow = backup.flow;
        return parsed;
      } catch (error) {
        console.error('[AutoSave] Backup restore failed:', error);
      }
    }
    return null;
  }

  /**
   * Get save status
   */
  getStatus(): SaveStatus {
    return { ...this.status };
  }

  /**
   * Clear all saved data
   */
  clear(): void {
    storageRemove(STORAGE_KEY);
    storageRemove(BACKUP_KEY);
    this.flow = null;
    this.lastSavedFlow = '';
    this.status = {
      lastSaved: null,
      isSaving: false,
      hasUnsavedChanges: false,
      backupCount: 0
    };
  }
}

// Singleton instance
export const autoSave = new AutoSave();
