/**
 * Settings — providers, keys, defaults, appearance, storage.
 *
 * Keys live in the browser only (session or stored in localStorage). Nothing
 * here is ever written to the repo or sent anywhere except the provider the
 * key belongs to.
 */

import React, { useState } from 'react';
import {
  Button,
  Card,
  Field,
  Grid,
  Input,
  Page,
  Pill,
  Select,
  Table,
  Td,
  Toggle,
  setThemeMode,
  theme
} from '../components/ui';
import { S2S_PROVIDERS, STT_PROVIDERS, TTS_PROVIDERS, SpeechProvider } from '../voice/providers';
import { KeyProvider, keySource, maskedKey, setKey } from '../voice/keyVault';
import { resetWorkspace, useWorkspace } from '../workspace/store';
import { listTestCases } from '../evals/TestCaseStore';
import type { PageContext } from './context';

// ── Providers & keys ─────────────────────────────────────────────────────

/**
 * Provider id -> vault key. Several providers share a vendor key
 * (openai-realtime and grok-voice are separate products, one API key each).
 */
const VAULT_BY_PROVIDER: Record<string, KeyProvider | undefined> = {
  deepgram: 'deepgram',
  openai: 'openai',
  'openai-realtime': 'openai',
  aws: undefined,
  google: 'google',
  'gemini-live': 'google',
  'nvidia-riva': 'nvidia',
  'nvidia-voice': 'nvidia',
  elevenlabs: 'elevenlabs',
  cartesia: 'cartesia',
  grok: 'xai',
  'grok-voice': 'xai',
  'kyutai-moshi': 'kyutai'
};

const Providers: React.FC<PageContext> = ({ notify }) => {
  const [, bump] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = (providerId: string) => {
    const vault = VAULT_BY_PROVIDER[providerId];
    const value = (drafts[providerId] || '').trim();
    if (!vault || !value) return;
    setKey(vault, value);
    setDrafts(d => ({ ...d, [providerId]: '' }));
    bump(n => n + 1);
    notify(providerId + ' key stored locally', 'good');
  };

  const renderGroup = (title: string, hint: string, providers: SpeechProvider[]) => (
    <Card key={title} title={title + ' (' + providers.length + ')'} hint={hint}>
      <Table columns={['Provider', 'Models', 'Streaming', 'Self-host', 'Key', '']}>
        {providers.map(p => {
          const vault = VAULT_BY_PROVIDER[p.id];
          const source = vault ? keySource(vault) : 'not required';
          return (
            <tr key={p.id}>
              <Td>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: theme.muted }}>{p.envKey}</div>
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted, maxWidth: 240 }}>
                {p.models.map(m => m.label).join(', ')}
              </Td>
              <Td>
                <Pill tone={p.streaming ? 'good' : 'muted'}>{p.streaming ? 'yes' : 'no'}</Pill>
              </Td>
              <Td>
                <Pill tone={p.selfHostable ? 'info' : 'muted'}>{p.selfHostable ? 'yes' : 'no'}</Pill>
              </Td>
              <Td>
                {vault ? (
                  <Input
                    type="password"
                    value={drafts[p.id] || ''}
                    onChange={v => setDrafts(d => ({ ...d, [p.id]: v }))}
                    placeholder={source === 'missing' ? 'paste key' : maskedKey(vault)}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: theme.muted }}>
                    uses env / instance role ({p.envKey})
                  </span>
                )}
              </Td>
              <Td>
                {vault ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button size="sm" onClick={() => save(p.id)}>
                      Save
                    </Button>
                    <Pill tone={source === 'session' ? 'good' : source === 'stored' ? 'info' : 'warn'}>
                      {source}
                    </Pill>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: theme.muted }}>—</span>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );

  return (
    <Page
      icon="🔑"
      title="Providers & Keys"
      hint="Speech and model providers. Keys stay in this browser — never in the repo, never in a trace. Realtime S2S additionally needs the provider live endpoint, so those sessions stay simulated until a key is present."
    >
      {renderGroup('Speech to text', 'Turn audio into text for the agent.', STT_PROVIDERS)}
      {renderGroup('Text to speech', 'Speak the agent reply.', TTS_PROVIDERS)}
      {renderGroup(
        'Speech to speech (realtime)',
        'One model for audio in and out — barge-in and turn-taking handled by the provider.',
        S2S_PROVIDERS
      )}
    </Page>
  );
};

// ── Agent defaults ───────────────────────────────────────────────────────

const Defaults: React.FC<PageContext> = ({ settings, onSettingsChange, notify }) => (
  <Page
    icon="🎚️"
    title="Agent Defaults"
    hint="The baseline every new node starts from. Per-node values always win — change them in the node's config panel."
  >
    <Card title="Models and speech">
      <Grid min={240}>
        <Field label="Default LLM">
          <Input
            value={settings.defaultModel}
            onChange={v => onSettingsChange({ ...settings, defaultModel: v })}
          />
        </Field>
        <Field label="Default STT">
          <Select
            value={settings.defaultSTT}
            onChange={v => onSettingsChange({ ...settings, defaultSTT: v })}
            options={STT_PROVIDERS.map(p => ({ label: p.label, value: p.id }))}
          />
        </Field>
        <Field label="Default TTS">
          <Select
            value={settings.defaultTTS}
            onChange={v => onSettingsChange({ ...settings, defaultTTS: v })}
            options={TTS_PROVIDERS.map(p => ({ label: p.label, value: p.id }))}
          />
        </Field>
        <Field label="Language" hint="Drives STT locale, TTS voice selection and script generation.">
          <Select
            value={settings.language}
            onChange={v => onSettingsChange({ ...settings, language: v })}
            options={[
              { label: 'English (US)', value: 'en' },
              { label: 'English (UK)', value: 'en-GB' },
              { label: 'Spanish', value: 'es' },
              { label: 'German', value: 'de' },
              { label: 'French', value: 'fr' },
              { label: 'Hindi', value: 'hi' }
            ]}
          />
        </Field>
      </Grid>
      <Button
        style={{ marginTop: 14 }}
        tone="primary"
        onClick={() => notify('Defaults saved', 'good')}
      >
        Save defaults
      </Button>
    </Card>

    <Card title="Behaviour">
      <div style={{ display: 'grid', gap: 10 }}>
        <Toggle
          checked={settings.notifications}
          onChange={v => onSettingsChange({ ...settings, notifications: v })}
          label="Toast notifications for saves, runs and validation"
        />
        <Toggle
          checked={settings.sounds}
          onChange={v => onSettingsChange({ ...settings, sounds: v })}
          label="Sound on voice runs"
        />
      </div>
    </Card>
  </Page>
);

// ── Appearance ───────────────────────────────────────────────────────────

const Appearance: React.FC<PageContext> = ({ settings, onSettingsChange }) => {
  const apply = (mode: 'dark' | 'light') => {
    setThemeMode(mode);
    onSettingsChange({ ...settings, theme: mode });
  };
  return (
    <Page
      icon="🎨"
      title="Appearance"
      hint="Theme applies to the workspace shell and every page. The canvas keeps its dark surface so node colours stay readable in both themes."
    >
      <Card title="Theme">
        <div style={{ display: 'flex', gap: 10 }}>
          {(['dark', 'light'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => apply(mode)}
              style={{
                padding: '14px 22px',
                borderRadius: 10,
                cursor: 'pointer',
                border: `1px solid ${settings.theme === mode ? theme.accent : theme.border}`,
                background: settings.theme === mode ? `${theme.accent}22` : theme.panel2,
                color: theme.text,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span style={{ fontSize: 18 }}>{mode === 'dark' ? '🌙' : '☀️'}</span>
              {mode === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Canvas" hint="Node rendering is fixed for legibility.">
        <div style={{ fontSize: 13, color: theme.muted }}>
          Node borders encode behaviour — dashed for AI, dotted for governance, double for voice and
          chat, solid for deterministic and control. That encoding is part of the contract and does
          not change with theme.
        </div>
      </Card>
    </Page>
  );
};

// ── Autosave & storage ───────────────────────────────────────────────────

const Storage: React.FC<PageContext> = ({ settings, onSettingsChange, notify }) => {
  const ws = useWorkspace();
  const [confirmReset, setConfirmReset] = useState(false);

  const items: Array<{ name: string; detail: string; count: number | null; onClear: () => void }> = [
    {
      name: 'Workspace configuration',
      detail: 'Guardrail rules, gateway endpoints, targets, members, orgs, quotas, flags, audit',
      count: ws.rules.length + ws.endpoints.length + ws.members.length + ws.orgs.length + ws.flags.length,
      onClear: () => {
        resetWorkspace();
        notify('Workspace configuration reset', 'good');
      }
    },
    {
      name: 'Eval cases',
      detail: 'Saved test cases from the Test Console',
      count: listTestCases().length,
      onClear: () => {
        localStorage.removeItem('agentic_cx_test_cases');
        notify('Eval cases cleared', 'good');
      }
    },
    {
      name: 'Simulation mocks',
      detail: 'Personas, scenarios and tool mocks in IndexedDB',
      count: null,
      onClear: () => {
        indexedDB.deleteDatabase('cx_designer');
        notify('Simulation mocks cleared', 'good');
      }
    }
  ];

  return (
    <Page
      icon="💾"
      title="Autosave & Storage"
      hint="The designer is local-first: flows autosave, configuration persists in localStorage, simulations live in IndexedDB. Nothing is sent anywhere."
    >
      <Card title="Autosave">
        <Grid min={240}>
          <Field label="Autosave" hint="Flow edits are written to local storage on this interval.">
            <Toggle
              checked={settings.autoSave}
              onChange={v => onSettingsChange({ ...settings, autoSave: v })}
              label={settings.autoSave ? 'Enabled' : 'Disabled'}
            />
          </Field>
          <Field label="Interval (ms)">
            <Input
              value={String(settings.autoSaveInterval)}
              onChange={v =>
                onSettingsChange({ ...settings, autoSaveInterval: Math.max(1000, Number(v) || 5000) })
              }
            />
          </Field>
        </Grid>
      </Card>

      <Card title="Stored locally">
        <Table columns={['What', 'What it holds', 'Items', '']}>
          {items.map(i => (
            <tr key={i.name}>
              <Td>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{i.name}</div>
                <div style={{ fontSize: 11, color: theme.muted }}>{i.detail}</div>
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{i.count === null ? 'IndexedDB' : `${i.count} records`}</Td>
              <Td>
                <Button size="sm" tone="danger" onClick={i.onClear}>
                  Clear
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Reset everything">
        <p style={{ fontSize: 13, color: theme.muted, marginTop: 0 }}>
          Restores guardrail rules, endpoints, members, organizations, quotas and flags to their
          seeded values. Your canvas is untouched.
        </p>
        {confirmReset ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              tone="danger"
              onClick={() => {
                resetWorkspace();
                setConfirmReset(false);
                notify('Workspace reset', 'good');
              }}
            >
              Yes, reset
            </Button>
            <Button tone="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button tone="danger" onClick={() => setConfirmReset(true)}>
            Reset workspace configuration
          </Button>
        )}
      </Card>
    </Page>
  );
};

export const settingsPages: Record<string, React.FC<PageContext>> = {
  'settings.providers': Providers,
  'settings.defaults': Defaults,
  'settings.appearance': Appearance,
  'settings.workspace': Storage
};

/** Key status per provider that needs one — Admin > Secrets reads this. */
export function secretSnapshot(): Array<{ provider: string; key: string; source: string }> {
  return (Object.keys(VAULT_BY_PROVIDER).filter(p => VAULT_BY_PROVIDER[p]) as string[]).map(id => {
    const vault = VAULT_BY_PROVIDER[id] as KeyProvider;
    return { provider: id, key: maskedKey(vault), source: keySource(vault) };
  });
}
