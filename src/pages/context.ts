/**
 * Page context — what every workspace page can reach.
 *
 * Deliberately small: pages read/write their own domain modules directly
 * (workspace store, rule engine, monitoring service). The context only
 * carries cross-cutting shell concerns: navigation, toast, and the settings
 * the shell owns.
 */

import type { Settings } from '../components/SettingsPanel';
import type { FlowGraph } from '../types/node';

export interface PageContext {
  flowName: string;
  flowVersion: string;
  nodeCount: number;
  /** The flow currently on the canvas. */
  currentFlow: FlowGraph;
  navigate: (pageId: string) => void;
  notify: (message: string, tone?: 'info' | 'good' | 'bad') => void;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}