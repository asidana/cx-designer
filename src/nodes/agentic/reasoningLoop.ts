/**
 * Reasoning Loop Node — ReAct pattern with hard ceilings.
 * 
 * Implements the agentic reasoning loop:
 *   Plan → Tool Call → Observe → Reflect → (repeat or done)
 * 
 * With safety ceilings:
 *   - Max iterations
 *   - Cost ceiling
 *   - Loop detection
 */

import { NodeDefinition, ExecutionContext, NodeResult, ToolCall } from '../../types/node';

interface ReasoningConfig {
  model: string;
  maxIterations: number;
  costCeiling: number;
  loopDetector: {
    maxSameToolCalls: number;
  };
  tools: Array<{
    name: string;
    type: string;
    endpoint?: string;
    requiresApproval?: boolean;
    preconditions?: Record<string, unknown>;
  }>;
  systemPrompt?: string;
  deadlineMs?: number;
}

export const reasoningLoopNode: NodeDefinition = {
  type: 'agentic.reasoning_loop',
  category: 'agentic',
  label: 'Reasoning Loop',
  description: 'Agentic reasoning with ReAct pattern, tools, and safety ceilings',
  icon: '🧠',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'User Input', required: true }
  ],
  outputs: [
    { id: 'response', type: 'text', label: 'Agent Response' },
    { id: 'toolCalls', type: 'json', label: 'Tool Calls' },
    { id: 'cost', type: 'number', label: 'Total Cost' }
  ],
  configSchema: [
    {
      name: 'model',
      label: 'LLM Model',
      type: 'select',
      options: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
        { label: 'Claude Haiku', value: 'claude-haiku-4-20250514' },
        { label: 'Llama 3.3 70B', value: 'llama-3.3-70b' }
      ],
      default: 'gpt-4o',
      required: true
    },
    {
      name: 'maxIterations',
      label: 'Max Iterations',
      type: 'number',
      default: 8,
      description: 'Maximum reasoning loop iterations'
    },
    {
      name: 'costCeiling',
      label: 'Cost Ceiling ($)',
      type: 'number',
      default: 0.50,
      description: 'Maximum cost per reasoning loop'
    },
    {
      name: 'loopDetector.maxSameToolCalls',
      label: 'Loop Detection Threshold',
      type: 'number',
      default: 3,
      description: 'Terminate after N identical tool calls'
    },
    {
      name: 'systemPrompt',
      label: 'System Prompt',
      type: 'textarea',
      placeholder: 'You are a helpful customer support agent...',
      description: 'System prompt for the reasoning loop'
    }
  ],

  async execute(context: ExecutionContext): Promise<NodeResult> {
    const config = this.config as unknown as ReasoningConfig;
    
    let iteration = 0;
    let totalCost = 0;
    const toolCallHistory: ToolCall[] = [];
    const reasoningTrace: string[] = [];
    const deadline = Date.now() + (config.deadlineMs ?? 12000);

    while (iteration < config.maxIterations && totalCost < config.costCeiling) {
      if (Date.now() > deadline) {
        return this.terminate('deadline_exceeded', context, reasoningTrace, totalCost);
      }
      // 1. Plan: LLM decides what to do
      const plan = await this.plan(context, config);
      totalCost += plan.tokenCost;

      // 2. Check for loops
      if (this.isLooping(plan.toolCall, toolCallHistory, config.loopDetector)) {
        return this.terminate('loop_detected', context, reasoningTrace, totalCost);
      }

      // 3. Policy gate BEFORE any side effect: preconditions + approval from tool definition
      if (plan.toolCall) {
        const toolDef = (config.tools || []).find(t => t.name === plan.toolCall!.name);
        const preconditionError = this.checkPreconditions(toolDef?.preconditions, context);
        if (preconditionError) {
          return this.terminate(`precondition_blocked:${preconditionError}`, context, reasoningTrace, totalCost);
        }

        if (toolDef?.requiresApproval) {
          const approved = await this.requestApproval(plan.toolCall);
          if (!approved) {
            return this.terminate('approval_denied', context, reasoningTrace, totalCost);
          }
        }

        // 4. Execute tool call only after gate passes
        const toolResult = await this.executeTool(plan.toolCall, context);
        toolCallHistory.push(plan.toolCall);

        // 5. Observe: Add result to context
        context.variables.set(`tool_result_${iteration}`, toolResult);
      }

      // 6. Reflect: LLM decides if done
      if (plan.isFinal) {
        return {
          outputs: {
            response: plan.response,
            toolCalls: toolCallHistory,
            cost: totalCost
          },
          nextNodes: [],
          variableUpdates: {
            reasoningTrace,
            toolCallHistory
          },
          guardrailViolations: [],
          auditEvents: []
        };
      }

      iteration++;
    }

    return this.terminate('max_iterations_reached', context, reasoningTrace, totalCost);
  },

  private async plan(
    context: ExecutionContext,
    config: ReasoningConfig
  ): Promise<{
    toolCall?: ToolCall;
    response?: string;
    isFinal: boolean;
    tokenCost: number;
  }> {
    // In real implementation: call LLM with tools
    // For now, return a mock plan
    return {
      response: 'This is a mock response from the reasoning loop.',
      isFinal: true,
      tokenCost: 0.01
    };
  },

  private async executeTool(
    call: ToolCall,
    context: ExecutionContext
  ): Promise<{ result: unknown }> {
    // In real implementation: execute tool via HTTP/MCP.
    // Approval and preconditions are enforced by the caller BEFORE this runs.
    void context;
    void call;
    return {
      result: { success: true }
    };
  }

  private checkPreconditions(
    preconditions: Record<string, unknown> | undefined,
    context: ExecutionContext
  ): string | null {
    if (!preconditions) return null;
    for (const [key, expected] of Object.entries(preconditions)) {
      const actual = context.variables.get(key);
      if (actual !== expected) {
        return `${key} !== ${String(expected)}`;
      }
    }
    return null;
  }

  private isLooping(
    call: ToolCall | undefined,
    history: ToolCall[],
    config: { maxSameToolCalls: number }
  ): boolean {
    if (!call) return false;
    const threshold = Math.max(2, config.maxSameToolCalls);
    if (history.length < threshold) return false;
    const recentCalls = history.slice(-threshold);
    return recentCalls.every(c =>
        c.name === call.name &&
        JSON.stringify(c.args) === JSON.stringify(call.args)
      );
  }

  private async requestApproval(toolCall: unknown): Promise<boolean> {
    // In real implementation: send approval request to UI.
    // Must be called BEFORE executeTool, never after.
    void toolCall;
    return true;
  }

  private terminate(
    reason: string,
    context: ExecutionContext,
    trace: string[],
    cost: number
  ): NodeResult {
    return {
      outputs: {
        response: `Terminated: ${reason}`,
        toolCalls: [],
        cost
      },
      nextNodes: [],
      variableUpdates: { terminationReason: reason },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  get config(): ReasoningConfig {
    return this._config;
  }

  private _config: ReasoningConfig = {
    model: 'gpt-4o',
    maxIterations: 8,
    costCeiling: 0.50,
    loopDetector: { maxSameToolCalls: 3 },
    tools: [],
    deadlineMs: 12000
  };
};
