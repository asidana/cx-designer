/**
 * Demo host for the agentic-cx-designer canvas feature.
 *
 * The whole product is one embeddable component: <CanvasDesigner />
 * (src/designer). This host only fills the viewport and hands it a
 * starter flow — the same integration a larger product will make.
 */

import React, { useRef } from 'react';
import {
  CanvasDesigner,
  type CanvasDesignerHandle,
  type FlowGraph
} from './designer';

const STARTER_FLOW: FlowGraph = {
  id: 'flow_starter',
  name: 'Account Support Agent',
  version: '1.0.0',
  nodes: [
    {
      id: 'input_1',
      type: 'chat.input',
      position: { x: 60, y: 180 },
      data: { nodeType: 'chat.input', label: 'Chat Input', config: {} }
    },
    {
      id: 'intent_1',
      type: 'agentic.intent_classifier',
      position: { x: 360, y: 140 },
      data: { nodeType: 'agentic.intent_classifier', label: 'Classify Intent', config: {} }
    },
    {
      id: 'reason_1',
      type: 'agentic.reasoning_loop',
      position: { x: 660, y: 100 },
      data: { nodeType: 'agentic.reasoning_loop', label: 'Reasoning Loop', config: {} }
    },
    {
      id: 'output_1',
      type: 'chat.output',
      position: { x: 960, y: 180 },
      data: { nodeType: 'chat.output', label: 'Chat Output', config: {} }
    },
    {
      id: 'guardrail_1',
      type: 'governance.guardrail',
      position: { x: 360, y: 340 },
      data: { nodeType: 'governance.guardrail', label: 'Guardrail', config: {} }
    }
  ],
  edges: [
    { id: 'e1', source: 'input_1', target: 'intent_1', animated: true },
    { id: 'e2', source: 'intent_1', target: 'reason_1', animated: true },
    { id: 'e3', source: 'reason_1', target: 'output_1', animated: true },
    { id: 'e4', source: 'reason_1', target: 'guardrail_1', animated: false, label: 'risky' }
  ]
};

const App: React.FC = () => {
  const designer = useRef<CanvasDesignerHandle | null>(null);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <CanvasDesigner
        ref={designer}
        initialFlow={STARTER_FLOW}
        theme="dark"
        persistence={true}
        onChange={flow => {
          // A larger product would persist or diff this canonical flow here.
          void flow;
        }}
      />
    </div>
  );
};

export default App;
