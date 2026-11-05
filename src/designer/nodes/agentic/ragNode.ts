/**
 * RAG Node — Knowledge retrieval with vector search
 * 
 * Retrieves relevant context from a knowledge base
 * to ground the agent's responses.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

export interface RAGConfig {
  knowledgeBase: string;
  topK: number;
  scoreThreshold: number;
  embeddingModel: string;
  reranker?: boolean;
}

export const ragNode: NodeDefinition = {
  type: 'agentic.rag',
  category: 'agentic',
  label: 'Knowledge Retrieval',
  description: 'Retrieve relevant context from knowledge base',
  icon: '📚',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'Query', required: true }
  ],
  outputs: [
    { id: 'context', type: 'text', label: 'Retrieved Context' },
    { id: 'sources', type: 'json', label: 'Sources' }
  ],
  configSchema: [
    {
      name: 'knowledgeBase',
      label: 'Knowledge Base',
      type: 'select',
      options: [
        { label: 'Customer Support KB', value: 'support_kb' },
        { label: 'Product Documentation', value: 'product_docs' },
        { label: 'FAQ', value: 'faq' },
        { label: 'Custom', value: 'custom' }
      ],
      default: 'support_kb',
      required: true
    },
    {
      name: 'topK',
      label: 'Top K Results',
      type: 'number',
      default: 4,
      description: 'Number of chunks to retrieve'
    },
    {
      name: 'scoreThreshold',
      label: 'Score Threshold',
      type: 'number',
      default: 0.7,
      description: 'Minimum similarity score (0-1)'
    },
    {
      name: 'embeddingModel',
      label: 'Embedding Model',
      type: 'select',
      options: [
        { label: 'OpenAI text-embedding-3-small', value: 'text-embedding-3-small' },
        { label: 'OpenAI text-embedding-3-large', value: 'text-embedding-3-large' },
        { label: 'Local (all-MiniLM)', value: 'all-MiniLM-L6-v2' }
      ],
      default: 'text-embedding-3-small'
    },
    {
      name: 'reranker',
      label: 'Enable Reranker',
      type: 'boolean',
      default: true,
      description: 'Re-rank results for better relevance'
    }
  ],

  async execute(_context: ExecutionContext, _instanceConfig: NodeConfig = {}): Promise<NodeResult> {

    // In real implementation:
    // 1. Embed the query
    // 2. Search vector database
    // 3. Re-rank if enabled
    // 4. Return top K chunks

    return {
      outputs: {
        context: 'Retrieved context from knowledge base...',
        sources: [
          { title: 'Source 1', score: 0.92 },
          { title: 'Source 2', score: 0.85 }
        ]
      },
      nextNodes: [],
      variableUpdates: {
        retrievedContext: 'Retrieved context...',
        ragSources: []
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    
    if (!config['knowledgeBase']) {
      errors.push({ field: 'knowledgeBase', message: 'Knowledge base is required' });
    }
    
    return { valid: errors.length === 0, errors };
  },

  config: {
    knowledgeBase: 'support_kb',
    topK: 4,
    scoreThreshold: 0.7,
    embeddingModel: 'text-embedding-3-small',
    reranker: true
  },
};
