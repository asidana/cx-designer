/**
 * Flow Templates — pre-built flow templates
 * 
 * Ready-to-use templates for common voice agent scenarios.
 */

import { FlowGraph } from '../types/node';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  flow: FlowGraph;
  tags: string[];
}

export const flowTemplates: FlowTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Handle billing, technical, and account inquiries with human handoff',
    category: 'Support',
    icon: '🎧',
    tags: ['support', 'voice', 'handoff'],
    flow: {
      id: 'template_support',
      name: 'Customer Support Agent',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: { config: { stt: { provider: 'deepgram' }, bargeIn: true }, label: 'Voice Input' }
        },
        {
          id: 'intent',
          type: 'agentic.intent_classifier',
          position: { x: 350, y: 200 },
          data: { config: { model: 'gpt-4o-mini', intents: [{ name: 'billing', description: 'Billing' }, { name: 'technical', description: 'Technical' }] }, label: 'Intent' }
        },
        {
          id: 'reasoning',
          type: 'agentic.reasoning_loop',
          position: { x: 600, y: 200 },
          data: { config: { model: 'gpt-4o', maxIterations: 8 }, label: 'Reasoning' }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 850, y: 200 },
          data: { config: { tts: { provider: 'elevenlabs' } }, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'intent' },
        { id: 'e2', source: 'intent', target: 'reasoning' },
        { id: 'e3', source: 'reasoning', target: 'voice_output' }
      ]
    }
  },
  {
    id: 'appointment-scheduler',
    name: 'Appointment Scheduler',
    description: 'Schedule appointments with calendar integration and confirmation',
    category: 'Scheduling',
    icon: '📅',
    tags: ['scheduling', 'calendar', 'confirmation'],
    flow: {
      id: 'template_appointment',
      name: 'Appointment Scheduler',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: { config: {}, label: 'Voice Input' }
        },
        {
          id: 'slots',
          type: 'deterministic.slot_collector',
          position: { x: 350, y: 200 },
          data: { config: { slots: [{ name: 'date', type: 'date', required: true, retries: 3 }, { name: 'time', type: 'string', required: true, retries: 3 }] }, label: 'Collect Slots' }
        },
        {
          id: 'reasoning',
          type: 'agentic.reasoning_loop',
          position: { x: 600, y: 200 },
          data: { config: { tools: [{ name: 'schedule_appointment', type: 'http' }] }, label: 'Schedule' }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 850, y: 200 },
          data: { config: {}, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'slots' },
        { id: 'e2', source: 'slots', target: 'reasoning' },
        { id: 'e3', source: 'reasoning', target: 'voice_output' }
      ]
    }
  },
  {
    id: 'order-tracker',
    name: 'Order Tracker',
    description: 'Track order status with database lookup and notifications',
    category: 'E-Commerce',
    icon: '📦',
    tags: ['ecommerce', 'orders', 'tracking'],
    flow: {
      id: 'template_order',
      name: 'Order Tracker',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: { config: {}, label: 'Voice Input' }
        },
        {
          id: 'slots',
          type: 'deterministic.slot_collector',
          position: { x: 350, y: 200 },
          data: { config: { slots: [{ name: 'order_id', type: 'alphanumeric', required: true, retries: 3 }] }, label: 'Order ID' }
        },
        {
          id: 'database',
          type: 'integration.database',
          position: { x: 600, y: 200 },
          data: { config: { type: 'postgres', operation: 'query' }, label: 'Lookup Order' }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 850, y: 200 },
          data: { config: {}, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'slots' },
        { id: 'e2', source: 'slots', target: 'database' },
        { id: 'e3', source: 'database', target: 'voice_output' }
      ]
    }
  },
  {
    id: 'faq-bot',
    name: 'FAQ Bot',
    description: 'Answer frequently asked questions with RAG',
    category: 'Support',
    icon: '❓',
    tags: ['faq', 'rag', 'knowledge-base'],
    flow: {
      id: 'template_faq',
      name: 'FAQ Bot',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: { config: {}, label: 'Voice Input' }
        },
        {
          id: 'rag',
          type: 'agentic.rag',
          position: { x: 350, y: 200 },
          data: { config: { knowledgeBase: 'faq', topK: 4 }, label: 'Knowledge Base' }
        },
        {
          id: 'reasoning',
          type: 'agentic.reasoning_loop',
          position: { x: 600, y: 200 },
          data: { config: { model: 'gpt-4o-mini' }, label: 'Answer' }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 850, y: 200 },
          data: { config: {}, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'rag' },
        { id: 'e2', source: 'rag', target: 'reasoning' },
        { id: 'e3', source: 'reasoning', target: 'voice_output' }
      ]
    }
  }
];

/**
 * Get all templates
 */
export function getTemplates(): FlowTemplate[] {
  return flowTemplates;
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): FlowTemplate | undefined {
  return flowTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): FlowTemplate[] {
  return flowTemplates.filter(t => t.category === category);
}

/**
 * Search templates
 */
export function searchTemplates(query: string): FlowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return flowTemplates.filter(
    t => t.name.toLowerCase().includes(lowerQuery) ||
         t.description.toLowerCase().includes(lowerQuery) ||
         t.tags.some(tag => tag.includes(lowerQuery))
  );
}
