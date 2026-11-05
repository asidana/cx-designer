/**
 * Pattern param form — the collapsed instance's declared parameter form
 * (Story & Patterns §6).
 *
 * A pattern's params are authored once on its catalogue descriptor
 * (`PatternTemplate.params`) and rendered by the shared schema-driven
 * `ConfigForm`, exactly as a node's `configSchema` is. `patternFormSchema` is
 * the pure projection between the two: no pattern needs its own form component,
 * and every field type the form supports is available to a pattern author.
 *
 * The instance stores param *values* (`instance.data.pattern.params`); the field
 * descriptors stay in the catalogue, so a form resolves them with
 * `getPattern(instance.data.pattern.patternId)` before projecting.
 */

import type { ConfigSchemaField } from '../types/node';
import type { PatternParam, PatternTemplate } from './FlowTemplates';

/** Project one declared param onto a config-form field. */
export function patternParamToField(param: PatternParam): ConfigSchemaField {
  return {
    name: param.name,
    label: param.label,
    type: param.type,
    default: param.default,
    options: param.options,
    placeholder: param.placeholder,
    description: param.description,
  };
}

/**
 * The collapsed card's parameter form, in authoring order. Values are the
 * instance's `data.pattern.params`; the schema is the descriptor's.
 */
export function patternFormSchema(pattern: PatternTemplate): ConfigSchemaField[] {
  return pattern.params.map(patternParamToField);
}
