/**
 * Pattern Node — a composed block (docs/STORY_AND_PATTERNS.md §5).
 *
 * A pattern instance is an ordinary node that *also* carries `data.pattern`.
 * Authoring keeps it collapsed or expanded; execution never meets it, because
 * `expandPatterns()` (src/canvas/patterns.ts) flattens its children into the
 * graph before the engine runs.
 *
 * This definition exists so the container has a **resolvable domain type** —
 * a palette entry, a preflight answer, a card. Its static ports stay generic;
 * the real entry/exit boundary and the parameter form are declared by the
 * pattern on `data.pattern` (per §5/§6), *not* by this shared type.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

export const patternNode: NodeDefinition = {
  type: 'control.pattern',
  category: 'control',
  label: 'Agent Pattern',
  description: 'Composed block — goal, tools, guardrails and fallbacks that expand to a subgraph',
  icon: '🧩',
  color: '#8b5cf6',
  inputs: [{ id: 'input', type: 'any', label: 'Input' }],
  outputs: [{ id: 'output', type: 'any', label: 'Output' }],
  // The parameter form is declared by the pattern (data.pattern), not here.
  configSchema: [],

  async execute(context: ExecutionContext, _config: NodeConfig = {}): Promise<NodeResult> {
    // Defensive passthrough only. A materialised pattern always expands before
    // execution, so the engine should never reach this node; this keeps a
    // params-only or malformed instance from crashing the run.
    return {
      outputs: { output: context.variables.get('input') ?? null },
      nextNodes: [],
      variableUpdates: {},
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    // A container has no config fields to validate; whether it carries a valid
    // `data.pattern` is a preflight concern, not a config-schema one.
    return { valid: true, errors: [] };
  }
};
