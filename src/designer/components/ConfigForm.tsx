/**
 * Schema-Driven Config Form
 * 
 * Renders form fields based on a node's configSchema.
 * Supports: string, number, boolean, select, textarea, json, password
 */

import React from 'react';
import { ConfigSchemaField, NodeConfig } from '../types/node';
import { theme } from '../design/themeRuntime';

interface ConfigFormProps {
  schema: ConfigSchemaField[];
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ schema, config, onChange }) => {
  const handleChange = (name: string, value: unknown) => {
    onChange({ ...config, [name]: value });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {schema.map((field) => (
        <FormField
          key={field.name}
          field={field}
          value={config[field.name]}
          onChange={(value) => handleChange(field.name, value)}
        />
      ))}
    </div>
  );
};

interface FormFieldProps {
  field: ConfigSchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}

const FormField: React.FC<FormFieldProps> = ({ field, value, onChange }) => {
  const fieldId = `cfg-${field.name}`;
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    border: `1px solid ${theme.border}`,
    background: theme.input,
    color: theme.text,
    fontSize: 13,
    fontFamily: 'inherit'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    color: theme.muted,
    fontWeight: 500
  };

  const descriptionStyle: React.CSSProperties = {
    marginTop: 4,
    fontSize: 11,
    color: theme.subtle
  };

  const renderInput = () => {
    switch (field.type) {
      case 'string':
        return (
          <input
            id={fieldId}
            type="text"
            value={(value as string) ?? (field.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={baseInputStyle}
          />
        );

      case 'password':
        return (
          <input
            id={fieldId}
            type="password"
            value={(value as string) ?? (field.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={baseInputStyle}
          />
        );

      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            value={(value as number) ?? (field.default as number) ?? 0}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '' || raw === '-' || raw === '.') return;
              const parsed = parseFloat(raw);
              if (!Number.isFinite(parsed)) return;
              onChange(parsed);
            }}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={baseInputStyle}
          />
        );

      case 'boolean':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={(value as boolean) ?? (field.default as boolean) ?? false}
              onChange={(e) => onChange(e.target.checked)}
              aria-label={field.label}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 13 }}>
              {(value as boolean) ?? (field.default as boolean) ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            id={fieldId}
            value={(value as string) ?? (field.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={baseInputStyle}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            value={(value as string) ?? (field.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={{ ...baseInputStyle, resize: 'vertical', minHeight: 80 }}
          />
        );

      case 'json':
        return (
          <textarea
            id={fieldId}
            value={
              typeof value === 'string'
                ? value
                : JSON.stringify(value ?? field.default ?? {}, null, 2)
            }
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={'{"key": "value"}'}
            rows={6}
            aria-label={field.label}
            aria-describedby={field.description ? `${fieldId}-desc` : undefined}
            style={{
              ...baseInputStyle,
              fontFamily: 'monospace',
              fontSize: 12,
              minHeight: 120
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <label htmlFor={field.type === 'boolean' ? undefined : fieldId} style={labelStyle}>
        {field.label}
        {field.required && (
          <span style={{ color: theme.danger, marginLeft: 4 }} aria-label="required">
            *
          </span>
        )}
      </label>
      {renderInput()}
      {field.description && (
        <p id={`${fieldId}-desc`} style={descriptionStyle}>
          {field.description}
        </p>
      )}
    </div>
  );
};
