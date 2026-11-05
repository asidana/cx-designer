/**
 * Flow Templates — pre-built flow templates
 * 
 * Ready-to-use templates for common voice agent scenarios.
 */

import { FlowGraph, PatternBinding, PatternBoundary } from '../types/node';

/** One field on a pattern's collapsed-card form (Story & Patterns §6). */
export interface PatternParam {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'json';
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  description?: string;
}

/**
 * A pattern's authoring metadata (§6). The template subgraph in `flow` becomes
 * the instance's children; this descriptor is copied onto `instance.data.pattern`
 * at instantiation. `boundary` refers to the `flow`'s **local** node ids.
 */
export interface PatternTemplate {
  /** `patternId` written to the instance, e.g. 'pattern.unified_agent'. */
  id: string;
  /** Template version, copied to `patternVersion`. */
  version: number;
  /** Human sentence for the collapsed card (`PatternInstance.summary`). */
  summary: string;
  /** One clean parameter form, not N loose nodes. */
  params: PatternParam[];
  /** Declared entry/exit boundary over the `flow`'s local node ids. */
  boundary: PatternBoundary;
  /**
   * Where each param lands on the children's config, over the `flow`'s **local**
   * node ids (§5/§6). Optional: params not listed stay on the collapsed card's
   * form but do not seed a child config.
   */
  bindings?: PatternBinding[];
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  flow: FlowGraph;
  tags: string[];
  /** Set iff this template instantiates a pattern instance (§6). */
  pattern?: PatternTemplate;
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
  },
  {
    id: 'concierge-gpt-live',
    name: 'Concierge (GPT Live)',
    description: 'Experience bot on GPT Live S2S: greets, routes billing vs booking, hands off. Runs on mocks until an OpenAI key is set.',
    category: 'Experience Bots',
    icon: '🛎️',
    tags: ['s2s', 'gpt-live', 'experience-bot'],
    flow: {
      id: 'template_concierge_gpt',
      name: 'Concierge (GPT Live)',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: {
            config: {
              'voice.mode': 'realtime-s2s',
              's2s.provider': 'openai-realtime',
              's2s.model': 'gpt-realtime',
              bargeIn: true
            },
            label: 'Voice Input'
          }
        },
        {
          id: 'intent',
          type: 'agentic.intent_classifier',
          position: { x: 350, y: 200 },
          data: {
            config: {
              model: 'gpt-4o-mini',
              intents: [
                { name: 'billing', description: 'Billing and payment issues' },
                { name: 'booking', description: 'Book or reschedule' }
              ],
              confidenceThreshold: 0.85,
              fallback: 'escalate_human'
            },
            label: 'Intent'
          }
        },
        {
          id: 'handoff',
          type: 'deterministic.human_handoff',
          position: { x: 600, y: 80 },
          data: { config: { queue: 'general' }, label: 'Handoff' }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 600, y: 320 },
          data: { config: {}, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'intent' },
        { id: 'e2', source: 'intent', target: 'handoff' },
        { id: 'e3', source: 'intent', target: 'voice_output' }
      ]
    }
  },
  {
    id: 'support-gemini-live',
    name: 'Support (Gemini Live)',
    description: 'Experience bot on Gemini Live S2S: multilingual support with guardrail and handoff. Runs on mocks until a Google key is set.',
    category: 'Experience Bots',
    icon: '🌐',
    tags: ['s2s', 'gemini-live', 'experience-bot'],
    flow: {
      id: 'template_support_gemini',
      name: 'Support (Gemini Live)',
      version: '1.0.0',
      nodes: [
        {
          id: 'voice_input',
          type: 'voice.input',
          position: { x: 100, y: 200 },
          data: {
            config: {
              'voice.mode': 'realtime-s2s',
              's2s.provider': 'gemini-live',
              's2s.model': 'gemini-2.5-flash-live',
              bargeIn: true
            },
            label: 'Voice Input'
          }
        },
        {
          id: 'guardrail',
          type: 'governance.guardrail',
          position: { x: 350, y: 200 },
          data: { config: { mode: 'builtin' }, label: 'Guardrail' }
        },
        {
          id: 'intent',
          type: 'agentic.intent_classifier',
          position: { x: 600, y: 200 },
          data: {
            config: {
              model: 'gpt-4o-mini',
              intents: [{ name: 'support', description: 'General support' }],
              confidenceThreshold: 0.85,
              fallback: 'escalate_human'
            },
            label: 'Intent'
          }
        },
        {
          id: 'voice_output',
          type: 'voice.output',
          position: { x: 850, y: 200 },
          data: { config: {}, label: 'Voice Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'voice_input', target: 'guardrail' },
        { id: 'e2', source: 'guardrail', target: 'intent' },
        { id: 'e3', source: 'intent', target: 'voice_output' }
      ]
    }
  },
  {
    id: 'knowledge-base-agent',
    name: 'Knowledge Base Agent',
    description: 'Answer from your knowledge base with citations; escalate when unanswerable. Point agentic.rag at your KB to extend.',
    category: 'Self-Help',
    icon: '📚',
    tags: ['rag', 'knowledge-base', 'self-help', 'citations', 'extendable'],
    flow: {
      id: 'template_kb_agent',
      name: 'Knowledge Base Agent',
      version: '1.0.0',
      nodes: [
        {
          id: 'chat_input',
          type: 'chat.input',
          position: { x: 100, y: 200 },
          data: { config: { quickReplies: ['Billing help', 'Talk to human'] }, label: 'Chat Input' }
        },
        {
          id: 'rag',
          type: 'agentic.rag',
          position: { x: 350, y: 200 },
          data: { config: { knowledgeBase: 'support_kb', topK: 4, scoreThreshold: 0.7 }, label: 'Knowledge Base' }
        },
        {
          id: 'reasoning',
          type: 'agentic.reasoning_loop',
          position: { x: 600, y: 200 },
          data: { config: { model: 'gpt-4o-mini', maxIterations: 4 }, label: 'Answer' }
        },
        {
          id: 'chat_output',
          type: 'chat.output',
          position: { x: 850, y: 200 },
          data: { config: { markdown: true, citations: true }, label: 'Chat Output' }
        },
        {
          id: 'handoff',
          type: 'deterministic.human_handoff',
          position: { x: 600, y: 420 },
          data: { config: { queue: 'general' }, label: 'Handoff' }
        }
      ],
      edges: [
        { id: 'e1', source: 'chat_input', target: 'rag' },
        { id: 'e2', source: 'rag', target: 'reasoning' },
        { id: 'e3', source: 'reasoning', target: 'chat_output' }
      ]
    }
  },
  {
    id: 'website-assistant',
    name: 'Website Assistant',
    description: 'Sync a site into a KB, then chat over it with citations. Production: run Website Sync once, then ask; demo runs both inline.',
    category: 'Self-Help',
    icon: '🌐',
    tags: ['rag', 'website-sync', 'knowledge-base', 'extendable'],
    flow: {
      id: 'template_website_assistant',
      name: 'Website Assistant',
      version: '1.0.0',
      nodes: [
        {
          id: 'crawl',
          type: 'agentic.webcrawler',
          position: { x: 100, y: 200 },
          data: {
            config: {
              provider: 'firecrawl',
              startUrls: ['https://example.com/docs'],
              crawlSubpages: true,
              pageLimit: 50,
              maxDepth: 2,
              includePaths: [],
              excludePaths: ['/admin'],
              targetKnowledgeBase: 'website_kb'
            },
            label: 'Sync Site'
          }
        },
        {
          id: 'chat_input',
          type: 'chat.input',
          position: { x: 350, y: 200 },
          data: { config: { quickReplies: ['Pricing', 'Getting started'] }, label: 'Chat Input' }
        },
        {
          id: 'rag',
          type: 'agentic.rag',
          position: { x: 600, y: 200 },
          data: { config: { knowledgeBase: 'website_kb', topK: 4, scoreThreshold: 0.7 }, label: 'Site KB' }
        },
        {
          id: 'chat_output',
          type: 'chat.output',
          position: { x: 850, y: 200 },
          data: { config: { markdown: true, citations: true }, label: 'Chat Output' }
        }
      ],
      edges: [
        { id: 'e1', source: 'crawl', target: 'chat_input' },
        { id: 'e2', source: 'chat_input', target: 'rag' },
        { id: 'e3', source: 'rag', target: 'chat_output' }
      ]
    }
  },
  {
    id: 'website-sync',
    name: 'Website Sync',
    description: 'Sync a website into a named knowledge base (provider, sub-pages, limits, include/exclude paths). Run first, then point any RAG flow at the KB id.',
    category: 'Self-Help',
    icon: '🔄',
    tags: ['website-sync', 'knowledge-base', 'indexing', 'extendable'],
    flow: {
      id: 'template_website_sync',
      name: 'Website Sync',
      version: '1.0.0',
      nodes: [
        {
          id: 'crawl',
          type: 'agentic.webcrawler',
          position: { x: 100, y: 200 },
          data: {
            config: {
              provider: 'firecrawl',
              startUrls: ['https://example.com/docs'],
              crawlSubpages: true,
              pageLimit: 50,
              maxDepth: 2,
              includePaths: [],
              excludePaths: ['/admin'],
              chunkSize: 1000,
              chunkOverlap: 200,
              targetKnowledgeBase: 'website_kb'
            },
            label: 'Sync Site'
          }
        },
        {
          id: 'chat_output',
          type: 'chat.output',
          position: { x: 400, y: 200 },
          data: { config: { markdown: false, citations: false }, label: 'Index Report' }
        }
      ],
      edges: [
        { id: 'e1', source: 'crawl', target: 'chat_output' }
      ]
    }
  },
  {
    id: 'pattern-unified-agent',
    name: 'Unified Agent Block',
    description: 'One goal-driven agent — goal, tools, guardrails and a handoff fallback — that expands to a subgraph',
    category: 'Agentic',
    icon: '🧩',
    tags: ['pattern', 'agentic', 'guardrails', 'tools', 'handoff'],
    pattern: {
      id: 'pattern.unified_agent',
      version: 1,
      summary: "Resolve the customer's goal with tools, bounded by guardrails, with a handoff fallback",
      params: [
        { name: 'goal', label: 'Goal', type: 'textarea', placeholder: 'Resolve the dispute', description: "The objective, in the designer's words" },
        { name: 'successCriteria', label: 'Success criteria', type: 'string', description: 'What "done" means; feeds the eval gate' },
        { name: 'tools', label: 'Tools', type: 'json', default: [], description: 'Tool refs — same shape as the reasoning loop' },
        { name: 'guardrailRef', label: 'Guardrails', type: 'select', default: 'pre+post', options: [
          { label: 'Pre + post', value: 'pre+post' },
          { label: 'Pre only', value: 'pre' },
          { label: 'Post only', value: 'post' }
        ] },
        { name: 'fallback', label: 'Fallback', type: 'select', default: 'human_handoff', options: [
          { label: 'Human handoff', value: 'human_handoff' }
        ] },
        { name: 'model', label: 'Model', type: 'string', default: 'gpt-4o-mini' },
        { name: 'maxIterations', label: 'Max iterations', type: 'number', default: 6 },
        { name: 'costCeiling', label: 'Cost ceiling', type: 'number', default: 0.25 },
        { name: 'deadlineMs', label: 'Deadline (ms)', type: 'number', default: 12000 }
      ],
      // The block's response exit is the post-guardrail output; the fallback exit
      // is the human-handoff child. `guard_pre` receives the block's input.
      boundary: { entry: 'guard_pre', exits: { response: 'guard_post', fallback: 'fallback' } },
      // The goal and the reasoning ceilings the block advertises land directly on
      // the reasoning-loop child ('goal' is reserved on the loop for AX4).
      bindings: [
        { param: 'goal', node: 'agent', config: 'goal' },
        { param: 'tools', node: 'agent', config: 'tools' },
        { param: 'model', node: 'agent', config: 'model' },
        { param: 'maxIterations', node: 'agent', config: 'maxIterations' },
        { param: 'costCeiling', node: 'agent', config: 'costCeiling' },
        { param: 'deadlineMs', node: 'agent', config: 'deadlineMs' }
      ]
    },
    flow: {
      id: 'pattern_unified_agent',
      name: 'Unified Agent Block',
      version: '1.0.0',
      nodes: [
        { id: 'guard_pre', type: 'governance.guardrail', position: { x: 100, y: 0 }, data: { config: {}, label: 'Guardrail (pre)' } },
        { id: 'goal_check', type: 'deterministic.business_rule', position: { x: 260, y: 0 }, data: { config: { rules: [] }, label: 'Goal preconditions' } },
        { id: 'agent', type: 'agentic.reasoning_loop', position: { x: 420, y: 0 }, data: { config: { goal: '', tools: [], maxIterations: 6, costCeiling: 0.25, deadlineMs: 12000 }, label: 'Reasoning loop' } },
        { id: 'guard_post', type: 'governance.guardrail', position: { x: 580, y: 0 }, data: { config: {}, label: 'Guardrail (post)' } },
        { id: 'fallback', type: 'deterministic.human_handoff', position: { x: 580, y: 160 }, data: { config: {}, label: 'Fallback' } }
      ],
      edges: [
        { id: 'e1', source: 'guard_pre', target: 'goal_check' },
        { id: 'e2', source: 'goal_check', target: 'agent', sourceHandle: 'allowed' },
        { id: 'e3', source: 'agent', target: 'guard_post', sourceHandle: 'response' },
        { id: 'e4', source: 'agent', target: 'fallback', sourceHandle: 'fallback' },
        { id: 'e5', source: 'goal_check', target: 'fallback', sourceHandle: 'violations' }
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
 * Look up a pattern descriptor by its `patternId` — the value carried on
 * `PatternInstance.patternId`. The catalogue is the single source of patterns
 * (Story & Patterns §6): there is no second registry, so the collapsed card's
 * parameter form (`patternFormSchema`) resolves its fields from here too.
 */
export function getPattern(patternId: string): PatternTemplate | undefined {
  for (const template of flowTemplates) {
    if (template.pattern?.id === patternId) return template.pattern;
  }
  return undefined;
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
