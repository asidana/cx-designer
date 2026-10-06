/**
 * Onboarding Flow — guide new users through the app
 */

import React, { useState } from 'react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: 'Welcome to Agentic CX Designer! 🎨',
    description: 'Build AI voice agents visually — no code required.',
    icon: '👋'
  },
  {
    title: 'Drag & Drop Nodes',
    description: 'Add nodes from the palette and connect them to build your agent.',
    icon: '🧩'
  },
  {
    title: 'Configure Your Agent',
    description: 'Click any node to configure models, prompts, and behavior.',
    icon: '⚙️'
  },
  {
    title: 'Test in Real-Time',
    description: 'Talk to your agent while building it with the test console.',
    icon: '🧪'
  },
  {
    title: 'Deploy Anywhere',
    description: 'Export as JSON, Python code, or deploy directly to production.',
    icon: '🚀'
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: 16,
        padding: 40,
        width: 500,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{step.icon}</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 24 }}>{step.title}</h2>
        <p style={{ margin: '0 0 24px', fontSize: 16, color: '#888' }}>{step.description}</p>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: index === currentStep ? '#8b5cf6' : '#333'
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                border: '1px solid #333',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#8b5cf6',
              color: 'white',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={onComplete}
          style={{
            marginTop: 16,
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 12
          }}
        >
          Skip tutorial
        </button>
      </div>
    </div>
  );
};
