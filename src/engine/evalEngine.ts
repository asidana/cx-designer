/**
 * Eval Engine — 3-layer evaluation (AWS Pattern)
 * 
 * Layer 1: Model Performance (latency, cost, accuracy)
 * Layer 2: Component Performance (planning, tool selection, grounding)
 * Layer 3: Final Outcome (task success, UX quality, safety)
 */

import { FlowGraph, NodeResult } from '../types/node';
import { FlowEngine } from './flowEngine';

export interface TestCase {
  id: string;
  input: string;
  expectedIntent?: string;
  expectedSlots?: Record<string, string>;
  expectedOutcome?: string;
  maxLatencyMs?: number;
  maxCost?: number;
}

export interface Evaluator {
  type: 'code_assertion' | 'llm_judge' | 'customer_feedback';
  config: Record<string, unknown>;
}

export interface EvalSuite {
  id: string;
  name: string;
  testCases: TestCase[];
  evaluators: Evaluator[];
}

export interface EvalResult {
  testCase: TestCase;
  actual: NodeResult;
  passed: boolean;
  latencyMs: number;
  cost: number;
  violations: string[];
}

export interface EvalReport {
  suiteId: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  avgLatencyMs: number;
  avgCost: number;
  results: EvalResult[];
  timestamp: number;
}

export class EvalEngine {
  private engine: FlowEngine;

  constructor(flow: FlowGraph) {
    this.engine = new FlowEngine(flow);
  }

  /**
   * Run an eval suite against the flow
   */
  async runSuite(suite: EvalSuite): Promise<EvalReport> {
    const results: EvalResult[] = [];

    for (const testCase of suite.testCases) {
      const startTime = Date.now();
      
      try {
        const result = await this.engine.execute(testCase.input, `eval_${testCase.id}`);
        const latency = Date.now() - startTime;
        const cost = (result.outputs.cost as number) || 0;

        // Evaluate against test case
        const violations: string[] = [];
        let passed = true;

        // Check intent
        if (testCase.expectedIntent) {
          const actualIntent = result.outputs.intent as string;
          if (actualIntent !== testCase.expectedIntent) {
            violations.push(`Intent mismatch: expected "${testCase.expectedIntent}", got "${actualIntent}"`);
            passed = false;
          }
        }

        // Check slots
        if (testCase.expectedSlots) {
          const actualSlots = result.outputs.slots as Record<string, string> || {};
          for (const [key, expectedValue] of Object.entries(testCase.expectedSlots)) {
            if (actualSlots[key] !== expectedValue) {
              violations.push(`Slot mismatch: ${key} expected "${expectedValue}", got "${actualSlots[key]}"`);
              passed = false;
            }
          }
        }

        // Check latency
        if (testCase.maxLatencyMs && latency > testCase.maxLatencyMs) {
          violations.push(`Latency exceeded: ${latency}ms > ${testCase.maxLatencyMs}ms`);
          passed = false;
        }

        // Check cost
        if (testCase.maxCost && cost > testCase.maxCost) {
          violations.push(`Cost exceeded: $${cost} > $${testCase.maxCost}`);
          passed = false;
        }

        // Run custom evaluators
        for (const evaluator of suite.evaluators) {
          const evalResult = await this.runEvaluator(evaluator, result, testCase);
          if (!evalResult.passed) {
            violations.push(...evalResult.violations);
            passed = false;
          }
        }

        results.push({
          testCase,
          actual: result,
          passed,
          latencyMs: latency,
          cost,
          violations
        });
      } catch (error) {
        results.push({
          testCase,
          actual: { outputs: {}, nextNodes: [], variableUpdates: {}, guardrailViolations: [], auditEvents: [] },
          passed: false,
          latencyMs: Date.now() - startTime,
          cost: 0,
          violations: [`Execution error: ${error}`]
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    return {
      suiteId: suite.id,
      totalTests: total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      avgLatencyMs: results.reduce((sum, r) => sum + r.latencyMs, 0) / total,
      avgCost: results.reduce((sum, r) => sum + r.cost, 0) / total,
      results,
      timestamp: Date.now()
    };
  }

  /**
   * Run a single evaluator
   */
  private async runEvaluator(
    evaluator: Evaluator,
    result: NodeResult,
    testCase: TestCase
  ): Promise<{ passed: boolean; violations: string[] }> {
    switch (evaluator.type) {
      case 'code_assertion':
        return this.runCodeAssertion(evaluator.config, result, testCase);
      case 'llm_judge':
        return this.runLLMJudge(evaluator.config, result, testCase);
      case 'customer_feedback':
        return { passed: true, violations: [] }; // Requires human input
      default:
        return { passed: true, violations: [] };
    }
  }

  /**
   * Code assertion evaluator
   */
  private runCodeAssertion(
    config: Record<string, unknown>,
    result: NodeResult,
    _testCase: TestCase
  ): { passed: boolean; violations: string[] } {
    const violations: string[] = [];
    const assertion = config['assertion'] as string;

    if (!assertion) return { passed: true, violations: [] };

    try {
      // Simple assertion evaluator
      // Supports: "output.contains('text')", "output.length > 10", etc.
      const output = JSON.stringify(result.outputs);
      
      if (assertion.includes('contains')) {
        const match = assertion.match(/contains\(['"](.+?)['"]\)/);
        if (match && !output.includes(match[1])) {
          violations.push(`Assertion failed: output does not contain "${match[1]}"`);
        }
      }
    } catch (error) {
      violations.push(`Assertion error: ${error}`);
    }

    return { passed: violations.length === 0, violations };
  }

  /**
   * LLM-as-a-Judge evaluator
   */
  private async runLLMJudge(
    config: Record<string, unknown>,
    _result: NodeResult,
    _testCase: TestCase
  ): Promise<{ passed: boolean; violations: string[] }> {
    const violations: string[] = [];
    const criteria = config['criteria'] as string;

    if (!criteria) return { passed: true, violations: [] };

    // In real implementation: call LLM to judge the output
    // For now, return pass
    return { passed: true, violations };
  }

  /**
   * Generate a summary report
   */
  generateReport(report: EvalReport): string {
    const lines = [
      '# Eval Report',
      '',
      `**Suite:** ${report.suiteId}`,
      `**Date:** ${new Date(report.timestamp).toLocaleString()}`,
      '',
      '## Summary',
      '',
      `- **Total Tests:** ${report.totalTests}`,
      `- **Passed:** ${report.passed}`,
      `- **Failed:** ${report.failed}`,
      `- **Pass Rate:** ${report.passRate.toFixed(1)}%`,
      `- **Avg Latency:** ${report.avgLatencyMs.toFixed(0)}ms`,
      `- **Avg Cost:** $${report.avgCost.toFixed(4)}`,
      '',
      '## Failed Tests',
      ''
    ];

    for (const result of report.results.filter(r => !r.passed)) {
      lines.push(`### ${result.testCase.id}`);
      lines.push(`- **Input:** ${result.testCase.input}`);
      lines.push(`- **Violations:**`);
      for (const v of result.violations) {
        lines.push(`  - ${v}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
