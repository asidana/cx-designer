/**
 * PHI patterns — healthcare identifiers redacted alongside PII.
 *
 * PHI never reaches logs, audit trails, or third-party models in the
 * clear. Patterns cover the machine-matchable identifiers; names and
 * free-text conditions still need the LLM judge + human review.
 */

export interface PhiPattern {
  regex: RegExp;
  replacement: string;
  label: string;
}

export const PHI_PATTERNS: PhiPattern[] = [
  {
    // DOB: 01/23/1975, 01-23-1975, 1975-01-23
    regex: /\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
    replacement: '[DOB]',
    label: 'dob'
  },
  {
    // US phone: 555-123-4567, (555) 123-4567, +1 5551234567
    regex: /(\+?1[\s.-]?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: '[PHONE]',
    label: 'phone'
  },
  {
    // MRN-like: MRN 123456, MR#12345678, medical record variants
    regex: /\b(MRN|MR#|MRN#|medical record)[\s:#-]*([A-Za-z0-9-]{4,12})\b/gi,
    replacement: '[MRN]',
    label: 'mrn'
  },
  {
    // Insurance/member IDs: Member ID ABC123456, Policy #XYZ-123
    regex: /\b(member(\s+id)?|policy(\s+(no|number))?|subscriber(\s+id)?)[\s:#-]*([A-Za-z0-9-]{5,16})\b/gi,
    replacement: '[MEMBER-ID]',
    label: 'member-id'
  },
  {
    // ZIP+4 (full 9-digit ZIP is identifying; 5-digit alone is not)
    regex: /\b\d{5}-\d{4}\b/g,
    replacement: '[ZIP]',
    label: 'zip9'
  }
];

export function redactPhi(text: string): { redacted: string; found: string[] } {
  let redacted = text;
  const found: string[] = [];
  for (const p of PHI_PATTERNS) {
    p.regex.lastIndex = 0;
    if (p.regex.test(redacted)) {
      found.push(p.label);
      redacted = redacted.replace(p.regex, p.replacement);
    }
  }
  return { redacted, found };
}
