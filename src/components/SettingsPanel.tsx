/**
 * Settings Panel — app settings and preferences
 */

import React, { useState } from 'react';
import { getKey, setKey, maskedKey, KeyProvider } from '../voice/keyVault';
import { PROBES, ProbeResult } from '../voice/liveAdapters';

interface Settings {
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveInterval: number;
  defaultModel: string;
  defaultSTT: string;
  defaultTTS: string;
  language: string;
  notifications: boolean;
  sounds: boolean;
}

const defaultSettings: Settings = {
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 5000,
  defaultModel: 'gpt-4o',
  defaultSTT: 'deepgram',
  defaultTTS: 'elevenlabs',
  language: 'en',
  notifications: true,
  sounds: true
};

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onClose }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onChange(newSettings);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: 100,
      background: 'rgba(15, 15, 26, 0.98)',
      border: '1px solid #333',
      borderRadius: 12,
      padding: 20,
      width: 350,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>⚙️ Settings</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ×
        </button>
      </div>

      {/* Theme */}
      <SettingGroup label="Appearance">
        <SettingSelect
          label="Theme"
          value={localSettings.theme}
          options={[
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' }
          ]}
          onChange={(v) => handleChange('theme', v as Settings['theme'])}
        />
      </SettingGroup>

      {/* Auto Save */}
      <SettingGroup label="Auto Save">
        <SettingToggle
          label="Enable Auto Save"
          value={localSettings.autoSave}
          onChange={(v) => handleChange('autoSave', v)}
        />
        {localSettings.autoSave && (
          <SettingSelect
            label="Interval"
            value={localSettings.autoSaveInterval}
            options={[
              { label: '1 second', value: 1000 },
              { label: '5 seconds', value: 5000 },
              { label: '10 seconds', value: 10000 },
              { label: '30 seconds', value: 30000 }
            ]}
            onChange={(v) => handleChange('autoSaveInterval', v)}
          />
        )}
      </SettingGroup>

      {/* Defaults */}
      <SettingGroup label="Defaults">
        <SettingSelect
          label="Default LLM"
          value={localSettings.defaultModel}
          options={[
            { label: 'GPT-4o', value: 'gpt-4o' },
            { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
            { label: 'Claude Haiku', value: 'claude-haiku-4-20250514' }
          ]}
          onChange={(v) => handleChange('defaultModel', v)}
        />
        <SettingSelect
          label="Default STT"
          value={localSettings.defaultSTT}
          options={[
            { label: 'Deepgram', value: 'deepgram' },
            { label: 'OpenAI Whisper', value: 'openai' },
            { label: 'AWS Transcribe', value: 'aws' },
            { label: 'NVIDIA Riva', value: 'nvidia-riva' }
          ]}
          onChange={(v) => handleChange('defaultSTT', v)}
        />
        <SettingSelect
          label="Default TTS"
          value={localSettings.defaultTTS}
          options={[
            { label: 'ElevenLabs', value: 'elevenlabs' },
            { label: 'OpenAI TTS', value: 'openai' },
            { label: 'AWS Polly', value: 'aws' },
            { label: 'Grok Voice (xAI)', value: 'grok' },
            { label: 'NVIDIA Riva', value: 'nvidia-riva' }
          ]}
          onChange={(v) => handleChange('defaultTTS', v)}
        />
      </SettingGroup>

      {/* API Keys (live experience bots; mocks stay active until set) */}
      <SettingGroup label="API Keys">
        <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>
          Stored only in this browser. Until keys are set, voice runs on mocks.
        </p>
        <ApiKeyRow provider="openai" label="OpenAI (GPT Live)" />
        <ApiKeyRow provider="xai" label="xAI (Grok Voice)" />
        <ApiKeyRow provider="google" label="Google (Gemini Live)" />
      </SettingGroup>

      {/* Notifications */}
      <SettingGroup label="Notifications">
        <SettingToggle
          label="Enable Notifications"
          value={localSettings.notifications}
          onChange={(v) => handleChange('notifications', v)}
        />
        <SettingToggle
          label="Sound Effects"
          value={localSettings.sounds}
          onChange={(v) => handleChange('sounds', v)}
        />
      </SettingGroup>

      {/* Language */}
      <SettingGroup label="Language">
        <SettingSelect
          label="Interface Language"
          value={localSettings.language}
          options={[
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
            { label: 'French', value: 'fr' },
            { label: 'German', value: 'de' },
            { label: 'Hindi', value: 'hi' }
          ]}
          onChange={(v) => handleChange('language', v)}
        />
      </SettingGroup>
    </div>
  );
};

const SettingGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
      {label}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  </div>
);

const SettingToggle: React.FC<{ label: string; value: boolean; onChange: (value: boolean) => void }> = ({
  label,
  value,
  onChange
}) => (
  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
    <span style={{ fontSize: 13 }}>{label}</span>
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
  </label>
);

const SettingSelect: React.FC<{
  label: string;
  value: string | number;
  options: Array<{ label: string; value: string | number }>;
  onChange: (value: any) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid #333',
        background: '#1a1a2e',
        color: 'white',
        fontSize: 13
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const ApiKeyRow: React.FC<{ provider: KeyProvider; label: string }> = ({
  provider,
  label
}) => {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [detail, setDetail] = useState<string>('');
  const [stored, setStored] = useState(() => getKey(provider) !== null);

  const save = () => {
    if (!draft.trim()) return;
    setKey(provider, draft);
    setDraft('');
    setStored(true);
    setStatus('idle');
    setDetail('');
  };

  const clear = () => {
    setKey(provider, '');
    setStored(false);
    setStatus('idle');
    setDetail('');
  };

  const test = async () => {
    const probe = PROBES[provider as keyof typeof PROBES];
    if (!probe) {
      setStatus('fail');
      setDetail('No live probe for this provider yet.');
      return;
    }
    setStatus('testing');
    const result: ProbeResult = await probe();
    setStatus(result.ok ? 'ok' : 'fail');
    setDetail(
      result.ok
        ? `Connected in ${result.latencyMs}ms${result.models?.length ? ` · e.g. ${result.models.slice(0, 2).join(', ')}` : ''}`
        : result.error || 'Probe failed.'
    );
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
        {label}{' '}
        <span style={{ color: stored ? '#10b981' : '#666' }}>
          {stored ? `● ${maskedKey(provider)}` : '○ not set (mocks active)'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste key…"
          spellCheck={false}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #333',
            background: '#1a1a2e',
            color: 'white',
            fontSize: 13
          }}
        />
        <button
          onClick={save}
          disabled={!draft.trim()}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: 'none',
            background: draft.trim() ? '#10b981' : '#333',
            color: 'white',
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            fontSize: 12
          }}
        >
          Save
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          onClick={test}
          disabled={(!stored && !draft.trim()) || status === 'testing'}
          style={{
            padding: '6px 10px',
            borderRadius: 4,
            border: '1px solid #333',
            background: 'transparent',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          {status === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
        {stored && (
          <button
            onClick={clear}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid #333',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Remove
          </button>
        )}
      </div>
      {(status === 'ok' || status === 'fail') && detail && (
        <div style={{ fontSize: 11, marginTop: 4, color: status === 'ok' ? '#10b981' : '#ef4444' }}>
          {detail}
        </div>
      )}
    </div>
  );
};
