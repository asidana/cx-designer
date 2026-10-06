/**
 * Auto Save — automatically save flow changes
 * 
 * Features:
 * - Debounced auto-save
 * - Local storage backup
 * - Recovery on crash
 * - Save status indicator
 */

import { FlowGraph } from '../types/node';

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxBackups: number;
}

export interface SaveStatus {
  lastSaved: number | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  backupCount: number;
}

const STORAGE_KEY = 'agentic_cx_autosave';
const BACKUP_KEY = 'agentic_cx_backups';

export class AutoSave {
  private config: AutoSaveConfig;
  private flow: FlowGraph | null = null;
  private lastSavedFlow: string = '';
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private status: SaveStatus = {
    lastSaved: null,
    isSaving: false,
    hasUnsavedChanges: false,
    backupCount: 0
  };

  constructor(config: Partial<AutoSaveConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intervalMs: config.intervalMs ?? 5000,
      maxBackups: config.maxBackups ?? 10
    };
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
      
      // Check if actually changed
      if (flowJSON === this.lastSavedFlow) {
        this.status.isSaving = false;
        this.status.hasUnsavedChanges = false;
        return;
      }

      // Save to local storage
      localStorage.setItem(STORAGE_KEY, flowJSON);
      
      // Create backup
      this.createBackup(flowJSON);

      this.lastSavedFlow = flowJSON;
      this.status.lastSaved = Date.now();
      this.status.hasUnsavedChanges = false;
    } catch (error) {
      console.error('[AutoSave] Save failed:', error);
    } finally {
      this.status.isSaving = false;
    }
  }

  /**
   * Create a backup
   */
  private createBackup(flowJSON: string): void {
    try {
      const backups = this.getBackups();
      backups.unshift({
        timestamp: Date.now(),
        flow: flowJSON
      });

      // Trim to max backups
      while (backups.length > this.config.maxBackups) {
        backups.pop();
      }

      localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
      this.status.backupCount = backups.length;
    } catch (error) {
      console.error('[AutoSave] Backup failed:', error);
    }
  }

  /**
   * Get all backups
   */
  getBackups(): Array<{ timestamp: number; flow: string }> {
    try {
      const data = localStorage.getItem(BACKUP_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Restore from auto-save
   */
  restore(): FlowGraph | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.flow = JSON.parse(data);
        this.lastSavedFlow = data;
        return this.flow;
      }
    } catch (error) {
      console.error('[AutoSave] Restore failed:', error);
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
        this.flow = JSON.parse(backup.flow);
        this.lastSavedFlow = backup.flow;
        return this.flow;
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
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
