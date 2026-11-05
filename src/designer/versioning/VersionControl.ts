/**
 * Version Control — manage flow versions with diff and rollback
 * 
 * Features:
 * - Create versions (snapshots)
 * - Compare versions (visual diff)
 * - Rollback to previous version
 * - Branch and merge
 * - Version history
 */

import { FlowGraph } from '../types/node';

export interface FlowVersion {
  id: string;
  flowId: string;
  version: string;
  name: string;
  description: string;
  flow: FlowGraph;
  createdAt: Date;
  createdBy: string;
  parentVersion?: string;
  tags: string[];
}

export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: Array<{
    nodeId: string;
    changes: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
  }>;
}

export class VersionControl {
  private versions: Map<string, FlowVersion[]> = new Map();

  /**
   * Create a new version
   */
  createVersion(
    flowId: string,
    flow: FlowGraph,
    name: string,
    description: string,
    createdBy: string,
    parentVersion?: string
  ): FlowVersion {
    const version: FlowVersion = {
      id: `ver_${Date.now()}`,
      flowId,
      version: this.getNextVersion(flowId),
      name,
      description,
      flow: JSON.parse(JSON.stringify(flow)), // Deep clone
      createdAt: new Date(),
      createdBy,
      parentVersion,
      tags: []
    };

    const flowVersions = this.versions.get(flowId) || [];
    flowVersions.push(version);
    this.versions.set(flowId, flowVersions);

    return version;
  }

  /**
   * Get all versions for a flow
   */
  getVersions(flowId: string): FlowVersion[] {
    return this.versions.get(flowId) || [];
  }

  /**
   * Get a specific version
   */
  getVersion(flowId: string, versionId: string): FlowVersion | undefined {
    const versions = this.versions.get(flowId) || [];
    return versions.find(v => v.id === versionId);
  }

  /**
   * Compare two versions
   */
  compareVersions(flowId: string, versionId1: string, versionId2: string): VersionDiff | null {
    const v1 = this.getVersion(flowId, versionId1);
    const v2 = this.getVersion(flowId, versionId2);

    if (!v1 || !v2) return null;

    const diff: VersionDiff = {
      added: [],
      removed: [],
      modified: []
    };

    const v1NodeIds = new Set(v1.flow.nodes.map(n => n.id));
    const v2NodeIds = new Set(v2.flow.nodes.map(n => n.id));

    // Find added nodes
    for (const id of v2NodeIds) {
      if (!v1NodeIds.has(id)) {
        diff.added.push(id);
      }
    }

    // Find removed nodes
    for (const id of v1NodeIds) {
      if (!v2NodeIds.has(id)) {
        diff.removed.push(id);
      }
    }

    // Find modified nodes
    for (const id of v1NodeIds) {
      if (v2NodeIds.has(id)) {
        const node1 = v1.flow.nodes.find(n => n.id === id);
        const node2 = v2.flow.nodes.find(n => n.id === id);

        if (node1 && node2) {
          const changes = this.compareNodes(node1, node2);
          if (changes.length > 0) {
            diff.modified.push({ nodeId: id, changes });
          }
        }
      }
    }

    return diff;
  }

  /**
   * Rollback to a previous version
   */
  rollback(flowId: string, versionId: string): FlowGraph | null {
    const version = this.getVersion(flowId, versionId);
    if (!version) return null;

    // Create a new version with the old flow
    this.createVersion(
      flowId,
      version.flow,
      `Rollback to ${version.version}`,
      `Rolled back to version ${version.version}`,
      'system',
      versionId
    );

    return version.flow;
  }

  /**
   * Get the next version number
   */
  private getNextVersion(flowId: string): string {
    const versions = this.versions.get(flowId) || [];
    if (versions.length === 0) return '1.0.0';

    const lastVersion = versions[versions.length - 1].version;
    const parts = lastVersion.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  /**
   * Compare two nodes
   */
  private compareNodes(node1: FlowGraph['nodes'][0], node2: FlowGraph['nodes'][0]): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    // Compare config
    const config1 = JSON.stringify(node1.data.config);
    const config2 = JSON.stringify(node2.data.config);
    if (config1 !== config2) {
      changes.push({
        field: 'config',
        oldValue: node1.data.config,
        newValue: node2.data.config
      });
    }

    // Compare position
    if (node1.position.x !== node2.position.x || node1.position.y !== node2.position.y) {
      changes.push({
        field: 'position',
        oldValue: node1.position,
        newValue: node2.position
      });
    }

    return changes;
  }
}

// Singleton instance
export const versionControl = new VersionControl();
