/**
 * Template Gallery — browse and use pre-built flow templates
 */

import React, { useState } from 'react';
import { flowTemplates } from '../templates/FlowTemplates';
import { FlowGraph } from '../types/node';

interface TemplateGalleryProps {
  onSelect: (flow: FlowGraph) => void;
  onClose: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(flowTemplates.map(t => t.category))];

  const filteredTemplates = flowTemplates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      width: 700,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>📚 Template Gallery</h2>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search templates..."
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
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

      {/* Template Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            style={{
              padding: 16,
              background: '#1a1a2e',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
            onClick={() => onSelect(template.flow)}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{template.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{template.name}</div>
            <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{template.description}</p>
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {template.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: '#333',
                  color: '#aaa'
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
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
