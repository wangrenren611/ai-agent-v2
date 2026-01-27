import dotenv from 'dotenv';
dotenv.config({ path: '.env.development', override: true });

console.log('Testing Agent integration...');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET (length=' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET');
console.log('OPENAI_API_BASE_URL:', process.env.OPENAI_API_BASE_URL || 'NOT SET');
console.log('AI_MODEL:', process.env.AI_MODEL || 'deepseek-chat (default)');

// Test imports
try {
  const { Agent } = await import('./src/agent/index.ts');
  const { OpenAIProvider } = await import('./src/providers/openai.ts');
  const { operatorPrompt } = await import('./src/prompts/operator.ts');
  const { registerDefaultToolsAsync, ToolRegistry } = await import('./src/tool/index.ts');

  console.log('✓ All imports successful');

  // Test tool registration
  await registerDefaultToolsAsync();
  const tools = ToolRegistry.getSchemas();
  console.log('✓ Registered', tools.length, 'tools');

  // Test provider creation
  const llmProvider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.OPENAI_API_BASE_URL || process.env.DEEPSEEK_BASE_URL || '',
  });
  console.log('✓ Provider created');

  // Test agent creation
  const agent = new Agent({
    model: process.env.AI_MODEL || 'deepseek-chat',
    llmProvider,
    systemPrompt: operatorPrompt({
      directory: process.cwd(),
      vcs: 'git',
      language: 'Chinese',
    }),
    tools,
  });
  console.log('✓ Agent created');

  // Test agent start
  await agent.start();
  console.log('✓ Agent started');

  console.log('\n✓ All tests passed! Agent is ready to use.');
  process.exit(0);
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
