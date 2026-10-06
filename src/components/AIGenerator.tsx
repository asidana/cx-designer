/**
 * AI Flow Generator — prompt → flow
 * 
 * Generates a complete flow from a natural language description.
 */

import React, { useState } from 'react';
import { FlowGenerator } from '../ai/FlowGenerator';
import { FlowGraph } from '../types/node';

interface AIGeneratorProps {
  onGenerate: (flow: FlowGraph) => void;
}

export const AIGenerator: React.FC<AIGeneratorProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const result = await FlowGenerator.generate({
        description: prompt,
        channel: 'voice'
      });
      
      onGenerate(result.flow);
      setExplanation(result.explanation);
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
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
      width: 500,
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>🤖 AI Flow Generator</h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#888' }}>
        Describe your agent in plain English. We'll build the flow for you.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Example: Create a customer support voice agent that handles billing inquiries. It should collect the account ID, check the balance, and offer a refund if the balance is over $100."
        rows={4}
        style={{
          width: '100%',
          padding: 12,
          borderRadius: 8,
          border: '1px solid #333',
          background: '#1a1a2e',
          color: 'white',
          fontSize: 14,
          resize: 'vertical',
          fontFamily: 'inherit'
        }}
      />

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        style={{
          marginTop: 12,
          width: '100%',
          padding: 12,
          borderRadius: 8,
          border: 'none',
          background: isGenerating ? '#333' : '#8b5cf6',
          color: 'white',
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500
        }}
      >
        {isGenerating ? '⏳ Generating...' : '✨ Generate Flow'}
      </button>

      {explanation && (
        <div style={{ marginTop: 16, padding: 12, background: '#1a1a2e', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>What was built:</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>{explanation}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 12, padding: 12, background: '#1a1a2e', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>💡 Suggestions:</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#aaa' }}>
            {suggestions.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => {
          setExplanation('');
          setSuggestions([]);
        }}
        style={{
          marginTop: 12,
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
