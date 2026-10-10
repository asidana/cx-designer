/**
 * Website Sync Node — sync website content into a knowledge base.
 *
 * Market-parity with Dify "Sync from website" and Botpress website data
 * sources: pick a provider (Firecrawl / Jina Reader / sitemap), scope the
 * crawl (sub-pages, page limit, depth, include/exclude paths), and write
 * parsed Markdown into the target knowledge base id that `agentic.rag`
 * reads. In production this calls the provider API; here it returns
 * deterministic mock counts so sync → ask flows run end to end.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';

interface CrawlerConfig {
  provider: 'firecrawl' | 'jina-reader' | 'sitemap';
  startUrls: string[];
  crawlSubpages: boolean;
  useSitemap: boolean;
  pageLimit: number;
  maxDepth: number;
  includePaths: string[];
  excludePaths: string[];
  sameDomainOnly: boolean;
  chunkSize: number;
  chunkOverlap: number;
  targetKnowledgeBase: string;
}

export const webcrawlerNode: NodeDefinition = {
  type: 'agentic.webcrawler',
  category: 'agentic',
  label: 'Website Sync',
  description: 'Sync website content into a knowledge base (Firecrawl / Jina / sitemap)',
  icon: '🌐',
  color: '#8b5cf6',
  inputs: [
    { id: 'input', type: 'text', label: 'Trigger / Seed URL' }
  ],
  outputs: [
    { id: 'documents', type: 'number', label: 'Pages Indexed' },
    { id: 'chunks', type: 'number', label: 'Chunks Written' },
    { id: 'knowledgeBase', type: 'text', label: 'Knowledge Base ID' }
  ],
  configSchema: [
    {
      name: 'provider',
      label: 'Sync Provider',
      type: 'select',
      options: [
        { label: 'Page Agent (native)', value: 'page-agent' },
        { label: 'Jina Reader', value: 'jina-reader' },
        { label: 'Sitemap', value: 'sitemap' }
      ],
      default: 'page-agent',
      required: true,
      description: 'Native page-agent sync needs no third-party crawl API'
    },
    {
      name: 'startUrls',
      label: 'Start URLs (JSON)',
      type: 'json',
      default: ['https://example.com/docs'],
      required: true,
      description: 'Seed URLs to sync from'
    },
    {
      name: 'crawlSubpages',
      label: 'Crawl Sub-pages',
      type: 'boolean',
      default: true
    },
    {
      name: 'useSitemap',
      label: 'Use Sitemap',
      type: 'boolean',
      default: false,
      description: 'Discover pages via sitemap.xml instead of link crawl'
    },
    {
      name: 'pageLimit',
      label: 'Page Limit',
      type: 'number',
      default: 50,
      description: 'Cap on pages fetched per run'
    },
    {
      name: 'maxDepth',
      label: 'Max Depth',
      type: 'number',
      default: 2,
      description: 'Link depth from seeds'
    },
    {
      name: 'includePaths',
      label: 'Include Only Paths (JSON)',
      type: 'json',
      default: [],
      description: 'e.g. ["/docs", "/faq"] — empty means all'
    },
    {
      name: 'excludePaths',
      label: 'Excluded Paths (JSON)',
      type: 'json',
      default: ['/admin'],
      description: 'Never sync these paths'
    },
    {
      name: 'sameDomainOnly',
      label: 'Same Domain Only',
      type: 'boolean',
      default: true
    },
    {
      name: 'chunkSize',
      label: 'Chunk Size (chars)',
      type: 'number',
      default: 1000
    },
    {
      name: 'chunkOverlap',
      label: 'Chunk Overlap (chars)',
      type: 'number',
      default: 200
    },
    {
      name: 'targetKnowledgeBase',
      label: 'Target Knowledge Base',
      type: 'string',
      default: 'website_kb',
      required: true,
      description: 'KB id that agentic.rag reads'
    }
  ],

  async execute(_context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as CrawlerConfig;
    const seeds = config.startUrls || [];
    const pageLimit = config.pageLimit ?? 50;

    // Deterministic mock: pretend each seed yields pages.
    const documents = Math.min(seeds.length * 5, pageLimit);
    const chunks = documents * 4;
    const summary =
      `Indexed ${documents} pages (${chunks} chunks) ` +
      `into knowledge base "${config.targetKnowledgeBase}".`;

    return {
      outputs: {
        documents,
        chunks,
        knowledgeBase: config.targetKnowledgeBase
      },
      nextNodes: [],
      variableUpdates: {
        crawlDocuments: documents,
        crawlChunks: chunks,
        crawlKnowledgeBase: config.targetKnowledgeBase,
        displayText: summary
      },
      guardrailViolations: [],
      auditEvents: []
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!Array.isArray(config['startUrls']) || (config['startUrls'] as unknown[]).length === 0) {
      errors.push({ field: 'startUrls', message: 'At least one start URL is required' });
    }
    if (!config['targetKnowledgeBase']) {
      errors.push({ field: 'targetKnowledgeBase', message: 'Target knowledge base is required' });
    }
    return { valid: errors.length === 0, errors };
  },

  config: {
    provider: 'page-agent',
    startUrls: ['https://example.com/docs'],
    crawlSubpages: true,
    useSitemap: false,
    pageLimit: 50,
    maxDepth: 2,
    includePaths: [],
    excludePaths: ['/admin'],
    sameDomainOnly: true,
    chunkSize: 1000,
    chunkOverlap: 200,
    targetKnowledgeBase: 'website_kb'
  },
};
