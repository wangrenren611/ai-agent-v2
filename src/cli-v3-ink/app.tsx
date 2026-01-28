/**
 * Main Application Component (Ink-based)
 *
 * Root component that sets up all providers and renders appropriate route.
 * Ensures only one TextInput is rendered at a time to avoid conflicts.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInputComponent from './components/input';
import Welcome from './components/welcome';
import { useAgentContext } from './context';
import { ICONS } from './utils/constants';
import { useAgent } from './hooks';



// ============================================================================
// Main App Component
// ============================================================================


const App: React.FC = () => {

  const [inputValue, setInputValue] = useState('');
  const { setAIMModel, aiModel } = useAgentContext();
  const currentPath = process.cwd();
  const agent = useAgent({
    selectedModel: aiModel,
    onStateChange: (state) => {
      console.log(state);
    },
    onMessage: (message) => {
      console.log(message);
    },
    onResponseUpdate: (chunk) => {
      console.log(chunk);
    },
    onResponseComplete: (message) => {
      console.log(message);
    },
    onProcessingChange: (state) => {
      console.log(state);
    },
    onAgentReady: (agent) => {
      console.log(agent);
    },
  });
  
  useInput((input, key) => {
    if(key.escape) {
      process.exit(0);
    }

    // console.log('input', input, key);
  });
  
  const handleSubmit = async (newValue: string) => {
   await  agent?.run(newValue);
  };

  const onChange = (newValue: string) => {
    setInputValue(newValue);
  };
  
  return (
        <Box flexDirection="column">
          <Welcome model={aiModel} currentPath={currentPath} />
          <Box><Text>Input:</Text>
          <Text>{inputValue||''}</Text></Box>
          <Box>
            <Text>{ICONS.INPUT}</Text>
            <TextInputComponent onSubmit={handleSubmit} value={inputValue} onChange={onChange} placeholder="Please input message" />
          </Box>
        </Box>
  );
};

export default App;
