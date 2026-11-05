/**
 * A2A Skill node — T9. Declares this flow as a delegatable Agent2Agent
 * skill (id, name, description). Execution emits the agent-card entry and
 * marks the flow skill on the session so an A2A call resolves to it.
 */

import { NodeDefinition, NodeConfig, ExecutionContext, NodeResult } from '../../types/node';

interface AgentSkillConfig {
  skillId: string;
  skillName: string;
  description: string;
  tags: string;
  streaming: boolean;
}

export const agentSkillNode: NodeDefinition = {
  type: 'agentic.agent_skill',
  category: 'agentic',
  label: 'A2A Skill',
  description: 'Advertise this flow as a delegatable Agent2Agent skill',
  icon: '🤝',
  color: '#8b5cf6',
  inputs: [{ id: 'text', type: 'text', label: 'Delegation Input' }],
  outputs: [{ id: 'agentCard', type: 'json', label: 'Agent Card Entry' }],
  configSchema: [
    { name: 'skillId', label: 'Skill id', type: 'string', default: 'order_help' },
    { name: 'skillName', label: 'Skill name', type: 'string', default: 'Order help' },
    { name: 'description', label: 'Description', type: 'textarea', default: 'Track and manage orders' },
    { name: 'tags', label: 'Tags (comma-separated)', type: 'string', default: 'orders' },
    { name: 'streaming', label: 'Streaming support', type: 'boolean', default: true }
  ],
  config: { skillId: 'order_help', skillName: 'Order help', description: 'Track and manage orders', tags: 'orders', streaming: true },

  async execute(context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as AgentSkillConfig;
    const tags = config.tags.split(',').map(t => t.trim()).filter(Boolean);
    const skill = {
      id: config.skillId,
      name: config.skillName,
      description: config.description,
      tags
    };
    const text = String(context.variables.get('input') || context.variables.get('displayText') || '');
    const existing = (context.variables.get('agentSkills') as Array<Record<string, unknown>>) || [];
    return {
      outputs: { agentCard: skill, delegation: text },
      nextNodes: [],
      variableUpdates: { agentSkills: [...existing, skill], streaming: config.streaming },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!config['skillId']) errors.push({ field: 'skillId', message: 'Skill id is required' });
    if (!config['skillName']) errors.push({ field: 'skillName', message: 'Skill name is required' });
    return { valid: errors.length === 0, errors };
  }
};