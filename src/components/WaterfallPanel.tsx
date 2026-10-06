/**
 * Latency Waterfall — per-turn execution segments.
 *
 * Horizontal bars per node (label + duration), scaled to the slowest
 * segment, with a budget line. Segments blowing the budget are flagged.
 * Feed it the `complete`/`error` trace events of a single run.
 */

import React from 'react';

export interface WaterfallSegment {
  nodeId: string;
  label: string;
  latencyMs: number;
  cost: number;
  errored: boolean;
}

interface WaterfallPanelProps {
  segments: WaterfallSegment[];
  budgetMs: number;
}

export const LATENCY_BUDGET_MS = 1000;

export const WaterfallPanel: React.FC<WaterfallPanelProps> = ({ segments, budgetMs }) => {
  const maxLatency = Math.max(...segments.map(s => s.latencyMs), 1);
  const total = segments.reduce((sum, s) => sum + s.latencyMs, 0);
  const overBudget = total > budgetMs;

  if (segments.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 40 }}>
        Run a test to see the latency waterfall
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: overBudget ? '#ef4444' : '#10b981',
          marginBottom: 8
        }}
      >
        <span>
          Total: {total.toFixed(0)}ms / {budgetMs}ms budget
        </span>
        {overBudget && <span>⚠️ OVER BUDGET</span>}
      </div>

      {segments.map((s, i) => {
        const widthPct = Math.max((s.latencyMs / maxLatency) * 100, 2);
        const blows = s.latencyMs > budgetMs;
        return (
          <div key={`${s.nodeId}_${i}`} style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: s.errored ? '#ef4444' : '#aaa',
                marginBottom: 2
              }}
            >
              <span>
                {s.errored ? '❌ ' : ''}
                {s.label}
                {blows ? ' ⚠️' : ''}
              </span>
              <span>
                {s.latencyMs.toFixed(0)}ms · ${s.cost.toFixed(4)}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: '#1a1a2e',
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  background: s.errored ? '#ef4444' : blows ? '#f59e0b' : '#8b5cf6',
                  borderRadius: 4
                }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ color: '#666', marginTop: 8 }}>
        Budget line: {budgetMs}ms end-of-speech → first-audio. Bars are per-node
        execution slices of this turn (STT/LLM/tool/TTS split arrives with real providers).
      </div>
    </div>
  );
};
