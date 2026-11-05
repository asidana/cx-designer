/**
 * Canvas node types — the renderer map handed to ReactFlow.
 *
 * Module-level and stable, because React Flow warns (and remounts) if
 * `nodeTypes` changes identity between renders.
 */

import type { NodeTypes } from 'reactflow';
import { CxNode } from './CxNode';
import { CANVAS_RENDERER_TYPE } from './domain';

export const canvasNodeTypes: NodeTypes = {
  [CANVAS_RENDERER_TYPE]: CxNode
};
