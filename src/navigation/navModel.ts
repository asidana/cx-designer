/**
 * Navigation Model
 *
 * The app's information architecture in one place: nine top-level sections,
 * each owning its own pages. Drives the side menu, the command palette,
 * keyboard shortcuts and the help section.
 *
 * Terminology follows the market (Retell / Vapi / Botpress / Microsoft):
 * CX Designer, Guardrails (Agent Firewall), Voice Gateway, Observability,
 * Insights, Settings, Admin, Super Admin, Help.
 */

export type SectionId =
  | 'designer'
  | 'guardrails'
  | 'gateway'
  | 'observability'
  | 'insights'
  | 'settings'
  | 'admin'
  | 'superadmin'
  | 'help';

export interface PageDef {
  /** Unique, `<section>.<page>`. */
  id: string;
  label: string;
  icon: string;
  hint: string;
  keywords: string[];
  /**
   * `workspace` pages own the whole area (the canvas); `page` pages render
   * inside the standard page frame with title, hint and content.
   */
  kind?: 'workspace' | 'page';
  /** Normalized key for the shortcut handler (lowercase, `shift+y`, `mod+,`). */
  key?: string;
  /** Display form of the shortcut. */
  shortcut?: string;
  /** Badge source id (e.g. 'preflight'). */
  badge?: string;
}

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: string;
  blurb: string;
  pages: PageDef[];
}

export const SECTIONS: SectionDef[] = [
  {
    id: 'designer',
    label: 'CX Designer',
    icon: '🎛️',
    blurb: 'Build, configure, test and ship agents',
    pages: [
      {
        id: 'designer.canvas',
        label: 'Canvas',
        icon: '🗺️',
        hint: 'The visual builder — drag, drop, connect, configure',
        keywords: ['workflow', 'graph', 'edit', 'build'],
        kind: 'workspace'
      },
      {
        id: 'designer.templates',
        label: 'Templates',
        icon: '📚',
        hint: 'Start from a market-standard agent template',
        keywords: ['starter', 'gallery', 'blueprint', 'new', 'preset'],
        shortcut: 'T',
        key: 't'
      },
      {
        id: 'designer.builder',
        label: 'Builder Chat',
        icon: '🤖',
        hint: 'Describe a change in plain English',
        keywords: ['ai', 'conversational', 'assistant', 'prompt', 'generate'],
        shortcut: 'B',
        key: 'b'
      },
      {
        id: 'designer.script',
        label: 'Script View',
        icon: '📜',
        hint: 'Linear conversation outline of the flow',
        keywords: ['outline', 'conversation', 'transcript', 'read'],
        shortcut: 'S',
        key: 's'
      },
      {
        id: 'designer.preflight',
        label: 'Preflight Lint',
        icon: '✈️',
        hint: 'Config-level lint before you run or ship',
        keywords: ['lint', 'warnings', 'readiness', 'best practice'],
        shortcut: 'L',
        key: 'l',
        badge: 'preflight'
      },
      {
        id: 'designer.validation',
        label: 'Flow Validation',
        icon: '✅',
        hint: 'Structural checks — wiring, orphans, dead ends',
        keywords: ['check', 'errors', 'structure', 'validate'],
        shortcut: 'V',
        key: 'v'
      },
      {
        id: 'designer.analytics',
        label: 'Node Analytics',
        icon: '📊',
        hint: 'Per-node latency, cost and error rate overlay',
        keywords: ['metrics', 'latency', 'cost', 'errors'],
        shortcut: 'A',
        key: 'a'
      },
      {
        id: 'designer.versions',
        label: 'Version History',
        icon: '🕘',
        hint: 'Timeline, restore and visual diff',
        keywords: ['history', 'undo', 'diff', 'timeline', 'restore'],
        shortcut: 'H',
        key: 'h'
      },
      {
        id: 'designer.testconsole',
        label: 'Test Console',
        icon: '🧪',
        hint: 'Talk to the agent, watch the live trace',
        keywords: ['run', 'debug', 'trace', 'conversation', 'simulate', 'eval'],
        shortcut: 'Shift+Y',
        key: 'shift+y'
      },
      {
        id: 'designer.flowio',
        label: 'Import / Export',
        icon: '📦',
        hint: 'JSON round-trip and LangGraph Python export',
        keywords: ['json', 'python', 'langgraph', 'download', 'upload'],
        shortcut: 'E',
        key: 'e'
      }
    ]
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    icon: '🛡️',
    blurb: 'Agent Firewall — rules, redaction, delegation',
    pages: [
      {
        id: 'guardrails.rules',
        label: 'Policy Rules',
        icon: '📋',
        hint: 'Ordered rules evaluated per phase, first match wins',
        keywords: ['policy', 'rules', 'block', 'redact', 'escalate', 'firewall']
      },
      {
        id: 'guardrails.redaction',
        label: 'PII / PHI Redaction',
        icon: '🩸',
        hint: 'Detect and redact personal and health data',
        keywords: ['pii', 'phi', 'redact', 'privacy', 'hipaa', 'gdpr', 'mask']
      },
      {
        id: 'guardrails.testbench',
        label: 'Test Bench',
        icon: '🔬',
        hint: 'Run text through the live rule set and see the decision',
        keywords: ['test', 'simulate', 'dry run', 'evaluate', 'decision']
      },
      {
        id: 'guardrails.agents',
        label: 'Agent Router',
        icon: '🧭',
        hint: 'Register agents and the tools each may call',
        keywords: ['delegation', 'router', 'agents', 'tools', 'orchestration']
      }
    ]
  },
  {
    id: 'gateway',
    label: 'Voice Gateway',
    icon: '📞',
    blurb: 'SIP / WebSocket / gRPC to your contact centre',
    pages: [
      {
        id: 'gateway.endpoints',
        label: 'Endpoints',
        icon: '🎚️',
        hint: 'Media endpoints the gateway listens on',
        keywords: ['sip', 'websocket', 'grpc', 'listen', 'address', 'endpoint']
      },
      {
        id: 'gateway.ccaas',
        label: 'CCaaS Targets',
        icon: '🏢',
        hint: 'Genesys, Amazon Connect, NICE, Twilio and more',
        keywords: ['genesys', 'connect', 'twilio', 'nice', 'ccaaS', 'carrier']
      },
      {
        id: 'gateway.sessions',
        label: 'Live Sessions',
        icon: '📞',
        hint: 'Calls in flight — state, codec, agent binding',
        keywords: ['calls', 'live', 'sessions', 'dial', 'hangup']
      },
      {
        id: 'gateway.transports',
        label: 'Transports',
        icon: '🔌',
        hint: 'Supported transports, codecs and what to plug in',
        keywords: ['transport', 'codec', 'pcmu', 'opus', 'sip', 'matrix']
      }
    ]
  },
  {
    id: 'observability',
    label: 'Observability',
    icon: '📈',
    blurb: 'Health, alerts, metrics and audit for production',
    pages: [
      {
        id: 'observability.health',
        label: 'Health',
        icon: '🩺',
        hint: 'Flow health from live execution metrics',
        keywords: ['dashboard', 'status', 'sla', 'uptime', 'health']
      },
      {
        id: 'observability.alerts',
        label: 'Alerts',
        icon: '🔔',
        hint: 'Threshold rules evaluated against live metrics',
        keywords: ['alerts', 'threshold', 'pager', 'notify', 'rules']
      },
      {
        id: 'observability.metrics',
        label: 'Metrics',
        icon: '📐',
        hint: 'Latency, cost and success-rate explorer',
        keywords: ['metrics', 'latency', 'cost', 'percentiles', 'prometheus']
      },
      {
        id: 'observability.audit',
        label: 'Audit Trail',
        icon: '🧾',
        hint: 'Who changed what, and when',
        keywords: ['audit', 'compliance', 'log', 'trail', 'history', 'changes']
      }
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: '🔍',
    blurb: 'What agents do, where they fail, what it costs',
    pages: [
      {
        id: 'insights.performance',
        label: 'Performance',
        icon: '⚡',
        hint: 'Per-node latency and cost from real runs',
        keywords: ['latency', 'cost', 'slowest', 'hotspots', 'nodes']
      },
      {
        id: 'insights.evals',
        label: 'Eval Suites',
        icon: '🧪',
        hint: 'Saved test cases and expectation matching',
        keywords: ['evals', 'tests', 'cases', 'regression', 'golden', 'qa']
      },
      {
        id: 'insights.channels',
        label: 'Channels',
        icon: '📡',
        hint: 'What each channel supports and degrades to',
        keywords: ['voice', 'chat', 'webchat', 'copilot', 'mcp', 'capabilities']
      },
      {
        id: 'insights.scenarios',
        label: 'Scenarios',
        icon: '🎬',
        hint: 'Personas and call scenarios used in simulations',
        keywords: ['personas', 'scenarios', 'simulation', 'mock', 'calls']
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    blurb: 'Providers, keys, defaults and appearance',
    pages: [
      {
        id: 'settings.providers',
        label: 'Providers & Keys',
        icon: '🔑',
        hint: 'Grok, GPT Live, Gemini Live, Riva, Kyutai, STT/TTS',
        keywords: ['keys', 'api', 'openai', 'xai', 'gemini', 'nvidia', 'vault']
      },
      {
        id: 'settings.defaults',
        label: 'Agent Defaults',
        icon: '🎚️',
        hint: 'Model, STT, TTS, language — the new-node baseline',
        keywords: ['defaults', 'model', 'stt', 'tts', 'language', 'baseline']
      },
      {
        id: 'settings.appearance',
        label: 'Appearance',
        icon: '🎨',
        hint: 'Theme and canvas density',
        keywords: ['theme', 'dark', 'light', 'density', 'look']
      },
      {
        id: 'settings.workspace',
        label: 'Autosave & Storage',
        icon: '💾',
        hint: 'Autosave interval and what is stored locally',
        keywords: ['autosave', 'storage', 'local', 'backup', 'interval']
      }
    ]
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '🛠️',
    blurb: 'Team, plugins, deployments and secrets',
    pages: [
      {
        id: 'admin.team',
        label: 'Team & Roles',
        icon: '👥',
        hint: 'Members and what they may do',
        keywords: ['users', 'roles', 'permissions', 'access', 'rbac']
      },
      {
        id: 'admin.plugins',
        label: 'Plugins',
        icon: '🧩',
        hint: 'Install node packs and adapters',
        keywords: ['marketplace', 'install', 'adapters', 'extend', 'packs']
      },
      {
        id: 'admin.deployments',
        label: 'Deployments',
        icon: '🚀',
        hint: 'Ship a flow to a runtime and track its status',
        keywords: ['deploy', 'release', 'environments', 'runtime', 'promote']
      },
      {
        id: 'admin.secrets',
        label: 'Secrets',
        icon: '🗝️',
        hint: 'Which provider keys are present in this workspace',
        keywords: ['secrets', 'keys', 'vault', 'credentials', 'status']
      }
    ]
  },
  {
    id: 'superadmin',
    label: 'Super Admin',
    icon: '🔐',
    blurb: 'Organizations, quotas, flags and compliance',
    pages: [
      {
        id: 'superadmin.orgs',
        label: 'Organizations',
        icon: '🏛️',
        hint: 'Tenants on this deployment',
        keywords: ['tenants', 'orgs', 'customers', 'workspaces']
      },
      {
        id: 'superadmin.quotas',
        label: 'Quotas & Limits',
        icon: '🚦',
        hint: 'Spend and usage ceilings per organization',
        keywords: ['quotas', 'limits', 'budget', 'spend', 'ceiling']
      },
      {
        id: 'superadmin.flags',
        label: 'Feature Flags',
        icon: '🚩',
        hint: 'Gate rollout of new capabilities',
        keywords: ['flags', 'toggle', 'rollout', 'beta', 'gate']
      },
      {
        id: 'superadmin.compliance',
        label: 'Compliance',
        icon: '⚖️',
        hint: 'Data residency, retention and attestations',
        keywords: ['compliance', 'residency', 'retention', 'gdpr', 'hipaa', 'soc2']
      }
    ]
  },
  {
    id: 'help',
    label: 'Help',
    icon: '❓',
    blurb: 'The end-to-end workflow, shortcuts and node catalog',
    pages: [
      {
        id: 'help.start',
        label: 'Getting Started',
        icon: '🚀',
        hint: 'Template → configure → test → ship, end to end',
        keywords: ['onboarding', 'tour', 'walkthrough', 'intro', 'first']
      },
      {
        id: 'help.shortcuts',
        label: 'Shortcuts',
        icon: '⌨️',
        hint: 'Every keyboard shortcut in the app',
        keywords: ['keys', 'keyboard', 'hotkeys', 'speed'],
        shortcut: '?',
        key: 'shift+/'
      },
      {
        id: 'help.nodes',
        label: 'Node Catalog',
        icon: '📖',
        hint: 'Every node type, its purpose and its ports',
        keywords: ['catalog', 'nodes', 'reference', 'docs', 'types']
      },
      {
        id: 'help.glossary',
        label: 'Glossary',
        icon: '📕',
        hint: 'Market terms — agent, handoff, AG-UI, A2UI, CCaaS',
        keywords: ['terms', 'definitions', 'vocabulary', 'jargon', 'glossary']
      }
    ]
  }
];

/** Default landing page. */
export const DEFAULT_PAGE = 'designer.canvas';

export function section(id: string): SectionDef | undefined {
  return SECTIONS.find(s => s.id === id);
}

export function page(id: string): PageDef | undefined {
  for (const s of SECTIONS) {
    const found = s.pages.find(p => p.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Section that owns a page id. */
export function sectionOfPage(pageId: string): SectionDef | undefined {
  return SECTIONS.find(s => s.pages.some(p => p.id === pageId));
}

/** normalized shortcut key → page id. */
export const PAGE_SHORTCUTS: Record<string, string> = SECTIONS.reduce(
  (acc, s) => {
    for (const p of s.pages) if (p.key) acc[p.key] = p.id;
    return acc;
  },
  {} as Record<string, string>
);