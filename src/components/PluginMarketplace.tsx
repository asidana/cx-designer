/**
 * Plugin Marketplace UI — discover and install plugins
 */

import React, { useState } from 'react';
import { pluginMarketplace, Plugin } from '../plugins/PluginMarketplace';

export const PluginMarketplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [plugins, setPlugins] = useState(pluginMarketplace.listPlugins());

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setPlugins(pluginMarketplace.searchPlugins(query));
    } else {
      setPlugins(pluginMarketplace.listPlugins());
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      setPlugins(pluginMarketplace.listPlugins());
    } else {
      setPlugins(pluginMarketplace.getPluginsByCategory(category as Plugin['category']));
    }
  };

  const handleInstall = (pluginId: string) => {
    pluginMarketplace.installPlugin(pluginId);
    setPlugins(pluginMarketplace.listPlugins());
  };

  const handleUninstall = (pluginId: string) => {
    pluginMarketplace.uninstallPlugin(pluginId);
    setPlugins(pluginMarketplace.listPlugins());
  };

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(15, 15, 26, 0.98)',
      border: '1px solid #333',
      borderRadius: 12,
      padding: 24,
      width: 600,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>🧩 Plugin Marketplace</h2>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search plugins..."
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #333',
          background: '#1a1a2e',
          color: 'white',
          fontSize: 14,
          marginBottom: 16
        }}
      />

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'nodes', 'guardrails', 'integrations', 'themes'].map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: 'none',
              background: selectedCategory === category ? '#8b5cf6' : '#1a1a2e',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              textTransform: 'capitalize'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Plugin List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            style={{
              padding: 16,
              background: '#1a1a2e',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{plugin.name}</span>
                <span style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: plugin.installed ? '#10b981' : '#333',
                  color: 'white'
                }}>
                  {plugin.installed ? 'Installed' : 'Not Installed'}
                </span>
              </div>
              <p style={{ margin: '4px 0', fontSize: 12, color: '#888' }}>
                {plugin.description}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
                <span>by {plugin.author}</span>
                <span>v{plugin.version}</span>
                <span>⬇ {plugin.downloads}</span>
                <span>⭐ {plugin.rating}</span>
              </div>
            </div>
            <button
              onClick={() => plugin.installed ? handleUninstall(plugin.id) : handleInstall(plugin.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 4,
                border: 'none',
                background: plugin.installed ? '#ef4444' : '#10b981',
                color: 'white',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              {plugin.installed ? 'Uninstall' : 'Install'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          // Close marketplace
        }}
        style={{
          marginTop: 16,
          padding: 8,
          borderRadius: 4,
          border: '1px solid #333',
          background: 'transparent',
          color: '#888',
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        Close
      </button>
    </div>
  );
};
