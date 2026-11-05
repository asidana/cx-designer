/**
 * CxNode — the canvas node card.
 *
 * One card that reads at a glance *and* at depth via progressive disclosure
 * across three zoom bands:
 *
 *   far    (zoom < 0.55)  icon + title          — read the shape of the flow
 *   normal (0.55–1.3)     + category + ports    — read the wiring
 *   close  (zoom > 1.3)   + config summary      — read the settings
 *
 * Type is resolved through `domainTypeOf` and the registry, never from the
 * renderer key, so the card is correct for every creation path. Status comes
 * from `data.cxStatus` (see status.ts); the card is presentational.
 */

import React from 'react';
import { Handle, Position, useStore, type NodeProps } from 'reactflow';
import type { HandleDefinition, NodeData, NodeDefinition, NodeType } from '../types/node';
import { nodeRegistry } from '../nodes/registry';
import { domainTypeOf } from './domain';
import { nodeSummary, nodeTitle } from './summary';
import type { CanvasNodeStatus } from './status';

export const ZOOM_FAR = 0.55;
export const ZOOM_CLOSE = 1.3;

export type ZoomBand = 'far' | 'normal' | 'close';

/** Which band a zoom level falls in. Exported so tests pin the thresholds. */
export function zoomBand(zoom: number): ZoomBand {
  if (!Number.isFinite(zoom) || zoom < ZOOM_FAR) return 'far';
  if (zoom > ZOOM_CLOSE) return 'close';
  return 'normal';
}

/** Port type → token, so port colour is token-driven and theme-correct. */
const PORT_TOKEN: Record<HandleDefinition['type'], string> = {
  audio: 'var(--cx-info)',
  text: 'var(--cx-accent)',
  json: 'var(--cx-muted)',
  boolean: 'var(--cx-warn)',
  number: 'var(--cx-success)',
  any: 'var(--cx-subtle)'
};

/** A text cue per status, so status never relies on colour alone. */
export const STATUS_GLYPH: Record<CanvasNodeStatus, string> = {
  idle: '○',
  selected: '◆',
  running: '▶',
  success: '✓',
  error: '✕',
  warning: '!',
  'diff-added': '+',
  'diff-modified': '~'
};

export interface CxNodeData extends NodeData {
  nodeType?: NodeType;
  cxStatus?: CanvasNodeStatus;
}

/** Vertical position of port i of n, as a percentage. */
export function portOffset(index: number, count: number): string {
  if (count <= 1) return '50%';
  return `${((index + 1) / (count + 1)) * 100}%`;
}

const Port: React.FC<{
  handle: HandleDefinition;
  kind: 'input' | 'output';
  index: number;
  count: number;
}> = ({ handle, kind, index, count }) => (
  <Handle
    id={index === 0 ? undefined : handle.id}
    type={kind === 'input' ? 'target' : 'source'}
    position={kind === 'input' ? Position.Left : Position.Right}
    isConnectable
    className="cx-port"
    // Handles are decorative for assistive tech; the node's aria-label
    // enumerates every port (see status.ariaLabelForNode).
    aria-hidden
    style={{
      top: portOffset(index, count),
      background: PORT_TOKEN[handle.type]
    }}
    data-port-type={handle.type}
  />
);

const PortLegend: React.FC<{ handles: HandleDefinition[]; kind: 'input' | 'output' }> = ({ handles, kind }) => {
  if (handles.length === 0) return null;
  // Rows stack in normal flow. (They used to be absolutely positioned at the
  // port offsets inside a zero-height container, so any node with 2+ ports on
  // one side rendered its labels on top of each other.)
  return (
    <div className={`cx-ports cx-ports--${kind}`}>
      {handles.map(h => (
        <div className="cx-port-row" key={h.id}>
          <span className="cx-port-dot" style={{ background: PORT_TOKEN[h.type] }} aria-hidden />
          <span className="cx-port-label">{h.label}</span>
          <span className="cx-port-type">{h.type}</span>
          {h.required ? (
            <span className="cx-port-req" title="Required" aria-label="Required">
              *<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>(required)</span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export const CxNode: React.FC<NodeProps<CxNodeData>> = ({ data, selected }) => {
  const zoom = useStore(state => state.transform[2]);
  const band = zoomBand(zoom);

  const domainType = domainTypeOf({ type: 'cx', data });
  const def: NodeDefinition | undefined = domainType ? nodeRegistry.get(domainType) : undefined;

  const status: CanvasNodeStatus = selected ? 'selected' : data?.cxStatus ?? 'idle';
  const title = nodeTitle({ data }, def);
  const summary = nodeSummary({ data }, def);
  const accent = def?.color ?? 'var(--cx-muted)';
  const category = def?.category ?? 'unknown';
  const inputs = def?.inputs ?? [];
  const outputs = def?.outputs ?? [];
  const showDetail = band !== 'far';

  return (
    <div
      className="cx-node"
      data-status={status}
      data-category={category}
      data-band={band}
      data-testid="cx-node"
      style={{ '--cx-node-accent': accent } as React.CSSProperties}
    >
      <span className="cx-node__stripe" aria-hidden />

      {inputs.map((h, i) => (
        <Port key={`in-${h.id}`} handle={h} kind="input" index={i} count={inputs.length} />
      ))}
      {outputs.map((h, i) => (
        <Port key={`out-${h.id}`} handle={h} kind="output" index={i} count={outputs.length} />
      ))}

      <header className="cx-node__header">
        <span className="cx-node__icon" aria-hidden>
          {def?.icon ?? '❓'}
        </span>
        <span className="cx-node__title">{title}</span>
        {showDetail ? <span className="cx-node__cat">{category}</span> : null}
      </header>

      {showDetail ? (
        <>
          <PortLegend handles={inputs} kind="input" />
          <PortLegend handles={outputs} kind="output" />
          <footer className="cx-node__footer">
            <span className={`cx-node__status cx-node__status--${status}`} aria-hidden>
              {STATUS_GLYPH[status]}
            </span>
            <span className="cx-node__summary">{summary}</span>
          </footer>
        </>
      ) : null}
    </div>
  );
};

export default CxNode;
