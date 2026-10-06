/**
 * Plugin Marketplace — discover and install community plugins
 * 
 * Plugins can add:
 * - Custom node types
 * - Custom guardrails
 * - Custom integrations
 * - Custom themes
 */

export interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: 'nodes' | 'guardrails' | 'integrations' | 'themes';
  downloads: number;
  rating: number;
  installed: boolean;
  config: Record<string, unknown>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  nodes?: string[];
  guardrails?: string[];
  integrations?: string[];
}

// Mock plugin registry
const availablePlugins: Plugin[] = [
  {
    id: 'salesforce-integration',
    name: 'Salesforce Integration',
    description: 'Connect to Salesforce CRM for customer data',
    author: 'Community',
    version: '1.0.0',
    category: 'integrations',
    downloads: 1250,
    rating: 4.5,
    installed: false,
    config: {}
  },
  {
    id: 'sentiment-guardrail',
    name: 'Sentiment Guardrail',
    description: 'Detect and handle negative sentiment',
    author: 'Community',
    version: '1.2.0',
    category: 'guardrails',
    downloads: 890,
    rating: 4.8,
    installed: false,
    config: {}
  },
  {
    id: 'stripe-payments',
    name: 'Stripe Payments',
    description: 'Process payments with Stripe',
    author: 'Community',
    version: '2.0.0',
    category: 'integrations',
    downloads: 2100,
    rating: 4.7,
    installed: false,
    config: {}
  },
  {
    id: 'multi-language',
    name: 'Multi-Language Support',
    description: 'Support 50+ languages with auto-detection',
    author: 'Community',
    version: '1.1.0',
    category: 'nodes',
    downloads: 3400,
    rating: 4.9,
    installed: false,
    config: {}
  }
];

export class PluginMarketplace {
  private plugins: Plugin[] = [...availablePlugins];
  private installedPlugins: Map<string, Plugin> = new Map();

  /**
   * List all available plugins
   */
  listPlugins(): Plugin[] {
    return this.plugins;
  }

  /**
   * Search plugins by name or description
   */
  searchPlugins(query: string): Plugin[] {
    const lowerQuery = query.toLowerCase();
    return this.plugins.filter(
      p => p.name.toLowerCase().includes(lowerQuery) ||
           p.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: Plugin['category']): Plugin[] {
    return this.plugins.filter(p => p.category === category);
  }

  /**
   * Install a plugin
   */
  installPlugin(pluginId: string): boolean {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (!plugin) return false;

    plugin.installed = true;
    this.installedPlugins.set(pluginId, plugin);

    // In real implementation:
    // 1. Download plugin package
    // 2. Validate manifest
    // 3. Register nodes/guardrails/integrations
    // 4. Update UI

    return true;
  }

  /**
   * Uninstall a plugin
   */
  uninstallPlugin(pluginId: string): boolean {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (!plugin) return false;

    plugin.installed = false;
    this.installedPlugins.delete(pluginId);

    return true;
  }

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    return this.installedPlugins.has(pluginId);
  }
}

// Singleton instance
export const pluginMarketplace = new PluginMarketplace();
