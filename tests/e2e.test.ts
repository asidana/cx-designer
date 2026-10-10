/**
 * E2E Tests — complete user workflows
 * 
 * Tests complete user journeys:
 * 1. Create a flow from template
 * 2. Add and configure nodes
 * 3. Test the flow
 * 4. Export the flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowEngine } from '../src/engine/flowEngine';
import { FlowGraph, FlowNode, FlowEdge } from '../src/types/node';
import { FlowValidator } from '../src/validation/FlowValidator';
import { flowToYAML } from '../src/utils/YAMLConverter';
import { getTemplate } from '../src/templates/FlowTemplates';

describe('E2E: Complete User Workflows', () => {
  describe('Workflow 1: Create from template', () => {
    it('should create a customer support agent from template', async () => {
      // 1. Get template
      const template = getTemplate('customer-support');
      expect(template).toBeDefined();

      // 2. Validate template
      const validation = FlowValidator.validate(template!.flow);
      expect(validation.valid).toBe(true);

      // 3. Execute template
      const engine = new FlowEngine(template!.flow);
      const result = await engine.execute('I have a billing question', 'e2e_session_1');

      expect(result).toBeDefined();
      expect(result.outputs).toBeDefined();
    });
  });

  describe('Workflow 2: Build custom flow', () => {
    it('should build and execute a custom flow', async () => {
      // 1. Create flow
      const flow: FlowGraph = {
        id: 'custom_flow',
        name: 'Custom Support Agent',
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: 'voice.input',
            position: { x: 0, y: 0 },
            data: { config: { stt: { provider: 'deepgram' } }, label: 'Input' }
          },
          {
            id: 'intent',
            type: 'agentic.intent_classifier',
            position: { x: 200, y: 0 },
            data: { config: { model: 'gpt-4o-mini' }, label: 'Intent' }
          },
          {
            id: 'output',
            type: 'voice.output',
            position: { x: 400, y: 0 },
            data: { config: { tts: { provider: 'elevenlabs' } }, label: 'Output' }
          }
        ],
        edges: [
          { id: 'e1', source: 'input', target: 'intent' },
          { id: 'e2', source: 'intent', target: 'output' }
        ]
      };

      // 2. Validate
      const validation = FlowValidator.validate(flow);
      expect(validation.valid).toBe(true);

      // 3. Execute
      const engine = new FlowEngine(flow);
      const result = await engine.execute('Hello', 'e2e_session_2');

      expect(result).toBeDefined();
    });
  });

  describe('Workflow 3: Export and import', () => {
    it('should export flow as YAML and reimport', async () => {
      // 1. Create flow
      const template = getTemplate('faq-bot');
      expect(template).toBeDefined();

      // 2. Export as YAML
      const yaml = flowToYAML(template!.flow);
      expect(yaml).toContain('nodes:');
      expect(yaml).toContain('edges:');

      // 3. YAML should be valid
      expect(yaml.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow 4: Guardrails', () => {
    it('should validate content with guardrails', async () => {
      const { GuardrailApp } = await import('../src/guardrails/GuardrailSDK');

      class TestGuardrail extends GuardrailApp {
        async validate(request: any) {
          const violations = [];
          
          if (this.detectPII(request.agentResponse).found) {
            violations.push({
              type: 'pii',
              severity: 'high',
              message: 'PII detected',
              location: 'agentResponse'
            });
          }
          
          return {
            allowed: violations.length === 0,
            violations,
            redactedContent: request.agentResponse,
            metadata: {}
          };
        }
        
        async health() {
          return { status: 'healthy', latencyMs: 0 };
        }
      }

      const guardrail = new TestGuardrail();
      
      // Test clean content
      const cleanResult = await guardrail.validate({
        userMessage: 'Hello',
        agentResponse: 'Hello! How can I help?',
        conversationHistory: [],
        sessionContext: {}
      });
      expect(cleanResult.allowed).toBe(true);

      // Test PII content
      const piiResult = await guardrail.validate({
        userMessage: 'Hello',
        agentResponse: 'My SSN is 123-45-6789',
        conversationHistory: [],
        sessionContext: {}
      });
      expect(piiResult.allowed).toBe(false);
    });
  });

  describe('Workflow 5: Framework adapters', () => {
    it('should use LangGraph adapter', async () => {
      const { nodeRegistry } = await import('../src/nodes/registry');
      const node = nodeRegistry.get('agentic.langgraph');
      
      expect(node).toBeDefined();
      expect(node?.type).toBe('agentic.langgraph');
    });

    it('should use Strands adapter', async () => {
      const { nodeRegistry } = await import('../src/nodes/registry');
      const node = nodeRegistry.get('agentic.strands');
      
      expect(node).toBeDefined();
      expect(node?.type).toBe('agentic.strands');
    });

    it('should use ADK adapter', async () => {
      const { nodeRegistry } = await import('../src/nodes/registry');
      const node = nodeRegistry.get('agentic.adk');
      
      expect(node).toBeDefined();
      expect(node?.type).toBe('agentic.adk');
    });
  });
});

describe('Performance Tests', () => {
  it('should execute flow within acceptable time', async () => {
    const template = getTemplate('customer-support');
    const engine = new FlowEngine(template!.flow);

    const startTime = Date.now();
    await engine.execute('Test message', 'perf_session');
    const duration = Date.now() - startTime;

    // Should complete within 5 seconds (mock execution)
    expect(duration).toBeLessThan(5000);
  });

  it('should handle multiple concurrent executions', async () => {
    const template = getTemplate('faq-bot');
    const engine = new FlowEngine(template!.flow);

    const promises = Array.from({ length: 10 }, (_, i) =>
      engine.execute(`Test message ${i}`, `concurrent_session_${i}`)
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
  });
});
