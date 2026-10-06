/**
 * Guardrail SDK — build custom guardrail apps
 * 
 * Every custom guardrail app implements this contract:
 * 
 * POST /validate
 *   input: { userMessage, agentResponse, conversationHistory, sessionContext }
 *   output: { allowed, violations, redactedContent, metadata }
 * 
 * GET /health
 *   output: { status, latencyMs }
 * 
 * This SDK provides helpers for building guardrail apps in Python and TypeScript.
 */

// ============================================
// TypeScript SDK
// ============================================

export interface ValidationRequest {
  userMessage: string;
  agentResponse: string;
  conversationHistory: Array<{ role: string; content: string }>;
  sessionContext: Record<string, unknown>;
}

export interface Violation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: string;
}

export interface ValidationResponse {
  allowed: boolean;
  violations: Violation[];
  redactedContent: string;
  metadata: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  latencyMs: number;
}

/**
 * Base class for custom guardrail apps (TypeScript)
 */
export abstract class GuardrailApp {
  abstract validate(request: ValidationRequest): Promise<ValidationResponse>;
  abstract health(): Promise<HealthResponse>;

  /**
   * Helper: Detect PII in text
   */
  protected detectPII(text: string): { found: boolean; redacted: string } {
    const patterns = [
      { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' },
      { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****-****-****-****' },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' }
    ];

    let redacted = text;
    let found = false;

    for (const pattern of patterns) {
      if (pattern.regex.test(redacted)) {
        found = true;
        redacted = redacted.replace(pattern.regex, pattern.replacement);
      }
    }

    return { found, redacted };
  }

  /**
   * Helper: Check for toxic content
   */
  protected detectToxicity(text: string): boolean {
    const toxicPatterns = ['hate', 'kill', 'stupid', 'idiot', 'dumb'];
    return toxicPatterns.some(p => text.toLowerCase().includes(p));
  }

  /**
   * Helper: Check for prompt injection attempts
   */
  protected detectInjection(text: string): boolean {
    const injectionPatterns = [
      'ignore previous instructions',
      'you are now',
      'new instructions',
      'system prompt',
      'override',
      'jailbreak'
    ];
    return injectionPatterns.some(p => text.toLowerCase().includes(p));
  }
}

// ============================================
// Python SDK (for reference)
// ============================================

export const PythonSDK = `
"""
Guardrail App SDK (Python)

Usage:
    from guardrail_sdk import GuardrailApp, ValidationRequest

    class MyGuardrail(GuardrailApp):
        async def validate(self, request: ValidationRequest) -> ValidationResponse:
            # Your custom logic here
            violations = []
            
            if self.detect_pii(request.agentResponse):
                violations.append(Violation(
                    type="pii",
                    severity="high",
                    message="PII detected",
                    location="agentResponse"
                ))
            
            return ValidationResponse(
                allowed=len(violations) == 0,
                violations=violations,
                redactedContent=self.redact_pii(request.agentResponse),
                metadata={}
            )
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
from pydantic import BaseModel

class Violation(BaseModel):
    type: str
    severity: str  # low, medium, high, critical
    message: str
    location: str

class ValidationRequest(BaseModel):
    userMessage: str
    agentResponse: str
    conversationHistory: List[Dict[str, str]]
    sessionContext: Dict[str, Any]

class ValidationResponse(BaseModel):
    allowed: bool
    violations: List[Violation]
    redactedContent: str
    metadata: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str  # healthy, degraded
    latencyMs: float

class GuardrailApp(ABC):
    @abstractmethod
    async def validate(self, request: ValidationRequest) -> ValidationResponse:
        pass
    
    @abstractmethod
    async def health(self) -> HealthResponse:
        pass
    
    def detect_pii(self, text: str) -> bool:
        import re
        patterns = [
            r'\\b\\d{3}-\\d{2}-\\d{4}\\b',  # SSN
            r'\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',  # Credit card
            r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',  # Email
        ]
        return any(re.search(p, text) for p in patterns)
    
    def redact_pii(self, text: str) -> str:
        import re
        patterns = [
            (r'\\b\\d{3}-\\d{2}-\\d{4}\\b', '***-**-****'),
            (r'\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b', '****-****-****-****'),
            (r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', '***@***.***'),
        ]
        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text)
        return text
    
    def detect_toxicity(self, text: str) -> bool:
        toxic_patterns = ['hate', 'kill', 'stupid', 'idiot', 'dumb']
        return any(p in text.lower() for p in toxic_patterns)
    
    def detect_injection(self, text: str) -> bool:
        injection_patterns = [
            'ignore previous instructions',
            'you are now',
            'new instructions',
            'system prompt',
            'override',
            'jailbreak'
        ]
        return any(p in text.lower() for p in injection_patterns)
`;
