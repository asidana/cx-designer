/**
 * Admin — team, plugins, deployments, secrets.
 *
 * Deployment here means: snapshot the flow into version history and mark it
 * live for the chosen environment. The runtime is this self-hosted workspace;
 * promoting a deployment re-points the flow the gateway serves.
 */

import React, { useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Field,
  Grid,
  Input,
  Page,
  Pill,
  Select,
  Stat,
  Table,
  Td,
  Toggle,
  theme
} from '../components/ui';
import { pluginMarketplace, Plugin } from '../plugins/PluginMarketplace';
import { ROLE_LABEL, Role, updateWorkspace, useWorkspace } from '../workspace/store';
import { versionControl } from '../versioning/VersionControl';
import { secretSnapshot } from './SettingsPages';
import type { PageContext } from './context';

const ROLE_MATRIX: Array<{ capability: string; owner: boolean; admin: boolean; builder: boolean; tester: boolean; viewer: boolean }> = [
  { capability: 'Build and edit flows', owner: true, admin: true, builder: true, tester: false, viewer: false },
  { capability: 'Configure guardrails and gateway', owner: true, admin: true, builder: false, tester: false, viewer: false },
  { capability: 'Run tests and simulations', owner: true, admin: true, builder: true, tester: true, viewer: false },
  { capability: 'Deploy to an environment', owner: true, admin: true, builder: false, tester: false, viewer: false },
  { capability: 'Manage team and plugins', owner: true, admin: true, builder: false, tester: false, viewer: false },
  { capability: 'Change orgs, quotas and flags', owner: true, admin: false, builder: false, tester: false, viewer: false }
];

const Team: React.FC<PageContext> = ({ notify }) => {
  const ws = useWorkspace();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('builder');

  const add = () => {
    if (!name.trim() || !email.trim()) return;
    const members = [
      ...ws.members,
      { id: `u_${Date.now()}`, name: name.trim(), email: email.trim(), role, lastActive: Date.now() }
    ];
    updateWorkspace({ members }, { area: 'admin', action: 'Added member', detail: `${name} as ${role}` });
    setName('');
    setEmail('');
    notify(`${name} added as ${ROLE_LABEL[role]}`);
  };

  return (
    <Page
      icon="👥"
      title="Team & Roles"
      hint="Who can design agents, who can change protection policy, who can ship. Roles are enforced by the gateway and the backend, not by the UI."
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Members" value={ws.members.length} />
        <Stat label="Admins" value={ws.members.filter(m => m.role === 'owner' || m.role === 'admin').length} />
        <Stat label="Testers" value={ws.members.filter(m => m.role === 'tester').length} />
      </div>

      <Card title="Members">
        <Table columns={['Name', 'Email', 'Role', 'Last active', '']}>
          {ws.members.map(m => (
            <tr key={m.id}>
              <Td style={{ fontWeight: 600 }}>{m.name}</Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{m.email}</Td>
              <Td>
                <Select
                  value={m.role}
                  onChange={v =>
                    updateWorkspace(
                      { members: ws.members.map(x => (x.id === m.id ? { ...x, role: v as Role } : x)) },
                      { area: 'admin', action: 'Changed role', detail: `${m.name} → ${v}` }
                    )
                  }
                  options={(Object.keys(ROLE_LABEL) as Role[]).map(r => ({ label: ROLE_LABEL[r], value: r }))}
                />
              </Td>
              <Td style={{ fontSize: 12, color: theme.muted }}>{new Date(m.lastActive).toLocaleString()}</Td>
              <Td>
                <Button
                  size="sm"
                  tone="danger"
                  disabled={m.role === 'owner'}
                  onClick={() => {
                    updateWorkspace(
                      { members: ws.members.filter(x => x.id !== m.id) },
                      { area: 'admin', action: 'Removed member', detail: m.name }
                    );
                    notify(`${m.name} removed`);
                  }}
                >
                  Remove
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Grid min={300}>
        <Card title="Invite a member">
          <Grid min={200}>
            <Field label="Name">
              <Input value={name} onChange={setName} placeholder="Dana Ortiz" />
            </Field>
            <Field label="Email">
              <Input value={email} onChange={setEmail} placeholder="dana@example.com" />
            </Field>
            <Field label="Role">
              <Select
                value={role}
                onChange={v => setRole(v as Role)}
                options={(Object.keys(ROLE_LABEL) as Role[]).map(r => ({ label: ROLE_LABEL[r], value: r }))}
              />
            </Field>
          </Grid>
          <Button style={{ marginTop: 12 }} tone="primary" disabled={!name.trim() || !email.trim()} onClick={add}>
            Add member
          </Button>
        </Card>

        <Card title="What each role can do">
          <Table columns={['Capability', 'Owner', 'Admin', 'Builder', 'Tester', 'Viewer']}>
            {ROLE_MATRIX.map(row => (
              <tr key={row.capability}>
                <Td style={{ fontSize: 12 }}>{row.capability}</Td>
                {(['owner', 'admin', 'builder', 'tester', 'viewer'] as const).map(r => (
                  <Td key={r}>
                    <Pill tone={row[r] ? 'good' : 'muted'}>{row[r] ? '✓' : '—'}</Pill>
                  </Td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>
      </Grid>
    </Page>
  );
};

const Plugins: React.FC<PageContext> = ({ notify }) => {
  const [plugins, setPlugins] = useState<Plugin[]>(() => pluginMarketplace.listPlugins());
  const refresh = () => setPlugins(pluginMarketplace.listPlugins());

  return (
    <Page
      icon="🧩"
      title="Plugins"
      hint="Node packs, guardrail bundles and integrations. Installed plugins register their nodes into the same palette as the built-ins."
      actions={<Button tone="ghost" onClick={refresh}>Refresh</Button>}
    >
      <Card title={`Available (${plugins.length})`}>
        <Table columns={['Plugin', 'Category', 'Author', 'Downloads', 'Rating', '']}>
          {plugins.map(p => (
            <tr key={p.id}>
              <Td>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: theme.muted, maxWidth: 380 }}>{p.description}</div>
              </Td>
              <Td>
                <Pill>{p.category}</Pill>
              </Td>
              <Td style={{ fontSize: 12 }}>{p.author}</Td>
              <Td style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.downloads.toLocaleString()}</Td>
              <Td style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.rating.toFixed(1)}</Td>
              <Td>
                {pluginMarketplace.isInstalled(p.id) ? (
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() => {
                      pluginMarketplace.uninstallPlugin(p.id);
                      refresh();
                      notify(`${p.name} uninstalled`);
                    }}
                  >
                    Uninstall
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    tone="primary"
                    onClick={() => {
                      pluginMarketplace.installPlugin(p.id);
                      refresh();
                      notify(`${p.name} installed`, 'good');
                    }}
                  >
                    Install
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </Page>
  );
};

const Deployments: React.FC<PageContext> = ({ flowName, flowVersion, navigate, currentFlow }) => {
  const ws = useWorkspace();
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>('staging');

  const deploy = () => {
    const id = `dep_${Date.now()}`;
    // Snapshot into version history first — a deployment must be revertable.
    versionControl.createVersion(
      'flow_1',
      currentFlow,
      flowName,
      `Deployed to ${environment}`,
      'you'
    );
    const record = {
      id,
      name: `${flowName} (${flowVersion})`,
      environment,
      status: 'live' as const,
      version: flowVersion,
      createdAt: Date.now()
    };
    updateWorkspace({ deployments: [record, ...ws.deployments] }, {
      area: 'admin',
      action: `Deployed to ${environment}`,
      detail: `${flowName} v${flowVersion}`
    });
  };

  return (
    <Page
      icon="🚀"
      title="Deployments"
      hint="Shipping a flow snapshots it into version history and marks it live for the target environment. Roll back from Version History — the flow definition is never lost."
      actions={<Button tone="ghost" onClick={() => navigate('designer.versions')}>Version history</Button>}
    >
      <Card title="Deploy the current flow">
        <Grid min={220}>
          <Field label="Environment">
            <Select
              value={environment}
              onChange={v => setEnvironment(v as 'dev' | 'staging' | 'prod')}
              options={[
                { label: 'Development', value: 'dev' },
                { label: 'Staging', value: 'staging' },
                { label: 'Production', value: 'prod' }
              ]}
            />
          </Field>
          <Field label="Flow">
            <Input value={`${flowName} · v${flowVersion}`} onChange={() => undefined} />
          </Field>
        </Grid>
        <Button style={{ marginTop: 14 }} tone="primary" onClick={deploy}>
          Deploy
        </Button>
      </Card>

      <Card title={`Deployments (${ws.deployments.length})`}>
        {ws.deployments.length === 0 ? (
          <Empty>Nothing deployed yet. Run the flow in the Test Console first, then deploy it.</Empty>
        ) : (
          <Table columns={['Deployment', 'Environment', 'Status', 'Version', 'When', '']}>
            {ws.deployments.map(d => (
              <tr key={d.id}>
                <Td>{d.name}</Td>
                <Td>
                  <Pill tone={d.environment === 'prod' ? 'bad' : d.environment === 'staging' ? 'warn' : 'info'}>
                    {d.environment}
                  </Pill>
                </Td>
                <Td>
                  <Pill tone={d.status === 'live' ? 'good' : d.status === 'failed' ? 'bad' : 'muted'}>
                    {d.status}
                  </Pill>
                </Td>
                <Td style={{ fontSize: 12 }}>v{d.version}</Td>
                <Td style={{ fontSize: 12, color: theme.muted }}>{new Date(d.createdAt).toLocaleString()}</Td>
                <Td>
                  <Button
                    size="sm"
                    tone="danger"
                    onClick={() =>
                      updateWorkspace(
                        { deployments: ws.deployments.map(x => (x.id === d.id ? { ...x, status: 'stopped' } : x)) },
                        { area: 'admin', action: 'Stopped deployment', detail: d.name }
                      )
                    }
                  >
                    Stop
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
};

const Secrets: React.FC<PageContext> = () => {
  const secrets = secretSnapshot();
  return (
    <Page
      icon="🗝️"
      title="Secrets"
      hint="Which provider credentials this workspace can actually use. Values are masked and never leave the browser — the backend only learns whether a key exists."
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Providers" value={secrets.length} />
        <Stat label="With a key" value={secrets.filter(s => s.source !== 'missing').length} tone="good" />
        <Stat
          label="Missing"
          value={secrets.filter(s => s.source === 'missing').length}
          tone={secrets.some(s => s.source === 'missing') ? 'warn' : 'good'}
        />
      </div>
      <Card title="Key status">
        <Table columns={['Provider', 'Masked value', 'Source']}>
          {secrets.map(s => (
            <tr key={s.provider}>
              <Td style={{ fontWeight: 600 }}>{s.provider}</Td>
              <Td style={{ fontFamily: 'monospace', fontSize: 12, color: theme.muted }}>{s.key}</Td>
              <Td>
                <Pill tone={s.source === 'session' ? 'good' : s.source === 'stored' ? 'info' : 'warn'}>
                  {s.source}
                </Pill>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Where to add them">
        <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.7 }}>
          Settings → Providers & Keys. Stored keys live in localStorage under{' '}
          <code>cx-designer-keys</code>; session keys are in-memory only and disappear on reload.
          Nothing here is ever committed.
        </div>
      </Card>
    </Page>
  );
};

export const adminPages: Record<string, React.FC<PageContext>> = {
  'admin.team': Team,
  'admin.plugins': Plugins,
  'admin.deployments': Deployments,
  'admin.secrets': Secrets
};

export { ROLE_LABEL };
export type { Role };
export const useToggle = Toggle;