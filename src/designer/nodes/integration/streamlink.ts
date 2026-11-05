/**
 * StreamLink Node — expose the flow to telephony/CCaaS.
 *
 * Binds this agent behind a StreamLink endpoint so outside systems
 * (SIP trunks, CCaaS, WebSocket or gRPC clients) can reach it.
 * Transport is owned by StreamLink, protection by Sentinel — the
 * agent node itself only carries business logic.
 */

import { NodeDefinition, ExecutionContext, NodeResult, NodeConfig } from '../../types/node';
import { CcaasTarget, StreamTransport, AudioCodec } from '../../streamlink/types';

interface StreamLinkNodeConfig {
  transport: StreamTransport;
  ccaas: CcaasTarget;
  endpointId: string;
  did?: string;
  codecs: AudioCodec[];
  dtmfMode: 'rfc2833' | 'inband' | 'sip-info';
  recordCalls: boolean;
  pciPauseOnPayment: boolean;
}

export const streamlinkNode: NodeDefinition = {
  type: 'integration.streamlink',
  category: 'integration',
  label: 'Voice Gateway',
  description: 'Expose the agent over SIP/WebSocket/gRPC to CCaaS and telephony',
  icon: '🔗',
  color: '#6366f1',
  inputs: [
    { id: 'input', type: 'audio', label: 'Agent Audio' }
  ],
  outputs: [
    { id: 'callId', type: 'text', label: 'Call ID' },
    { id: 'status', type: 'text', label: 'Call Status' }
  ],
  configSchema: [
    {
      name: 'transport',
      label: 'Transport',
      type: 'select',
      options: [
        { label: 'SIP', value: 'sip' },
        { label: 'WebSocket', value: 'websocket' },
        { label: 'gRPC', value: 'grpc' }
      ],
      default: 'sip',
      required: true,
      description: 'How outside systems reach this agent'
    },
    {
      name: 'ccaas',
      label: 'CCaaS Target',
      type: 'select',
      options: [
        { label: 'Genesys', value: 'genesys' },
        { label: 'Five9', value: 'five9' },
        { label: 'Avaya', value: 'avaya' },
        { label: 'Amazon Connect', value: 'amazon-connect' },
        { label: 'Custom', value: 'custom' }
      ],
      default: 'custom',
      description: 'Contact-center platform on the other side'
    },
    {
      name: 'endpointId',
      label: 'Endpoint ID',
      type: 'string',
      placeholder: 'support-queue-sip',
      required: true,
      description: 'Voice gateway endpoint this agent binds to'
    },
    {
      name: 'did',
      label: 'DID / Number',
      type: 'string',
      placeholder: '+1234567890'
    },
    {
      name: 'dtmfMode',
      label: 'DTMF Mode',
      type: 'select',
      options: [
        { label: 'RFC2833 (recommended)', value: 'rfc2833' },
        { label: 'In-band', value: 'inband' },
        { label: 'SIP INFO', value: 'sip-info' }
      ],
      default: 'rfc2833',
      description: 'RFC2833 keeps digits out of STT audio'
    },
    {
      name: 'recordCalls',
      label: 'Record Calls',
      type: 'boolean',
      default: true
    },
    {
      name: 'pciPauseOnPayment',
      label: 'Pause Recording on Payment',
      type: 'boolean',
      default: true,
      description: 'Auto-pause media recording during card capture'
    }
  ],

  async execute(_context: ExecutionContext, instanceConfig: NodeConfig = {}): Promise<NodeResult> {
    const config = { ...this.config, ...instanceConfig } as unknown as StreamLinkNodeConfig;

    // In production this binds via the StreamLink service; here we record
    // the binding intent into session state for the runtime to pick up.
    const callId = `sl_${Date.now()}`;

    return {
      outputs: {
        callId,
        status: 'bound'
      },
      nextNodes: [],
      variableUpdates: {
        streamlink: {
          endpointId: config.endpointId,
          transport: config.transport,
          ccaas: config.ccaas,
          callId,
          dtmfMode: config.dtmfMode,
          pciPauseOnPayment: config.pciPauseOnPayment
        }
      },
      guardrailViolations: [],
      auditEvents: [
        {
          id: `audit_${Date.now()}`,
          timestamp: Date.now(),
          nodeId: 'streamlink',
          eventType: 'start',
          data: {
            endpointId: config.endpointId,
            transport: config.transport,
            ccaas: config.ccaas
          },
          latencyMs: 0
        }
      ]
    };
  },

  validate(config: Record<string, unknown>): { valid: boolean; errors: Array<{ field: string; message: string }> } {
    const errors: Array<{ field: string; message: string }> = [];
    if (!config['transport']) {
      errors.push({ field: 'transport', message: 'Transport is required' });
    }
    if (!config['endpointId']) {
      errors.push({ field: 'endpointId', message: 'Endpoint ID is required' });
    }
    return { valid: errors.length === 0, errors };
  },

  config: {
    transport: 'sip',
    ccaas: 'custom',
    endpointId: '',
    codecs: ['pcmu', 'opus'],
    dtmfMode: 'rfc2833',
    recordCalls: true,
    pciPauseOnPayment: true
  },
};
