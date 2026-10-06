/**
 * Schema-Driven Config Form
 * 
 * Renders form fields based on a node's configSchema.
 * Supports: string, number, boolean, select, textarea, json, password
 */

import React from 'react';
import { ConfigSchemaField, NodeConfig } from '../types/node';

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
  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #333',
    background: '#16213e',
    color: 'white',
    fontSize: 13,
    fontFamily: 'inherit'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    color: '#aaa',
    fontWeight: 500
  };

  const descriptionStyle: React.CSSProperties = {
    marginTop: 4,
    fontSize: 11,
    color: '#666'
  };

  const renderInput = () => {
    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            value={(value as string) || (field.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={(value as string) || (field.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={baseInputStyle}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? (field.default as number) ?? 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
            value={(value as string) || (field.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
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
            value={(value as string) || (field.default as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            style={{ ...baseInputStyle, resize: 'vertical', minHeight: 80 }}
          />
        );

      case 'json':
        return (
          <textarea
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
      <label style={labelStyle}>
        {field.label}
        {field.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </label>
      {renderInput()}
      {field.description && <p style={descriptionStyle}>{field.description}</p>}
    </div>
  );
};
