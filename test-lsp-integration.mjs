/**
 * LSP Tool Integration Test
 *
 * 测试 LSP 工具是否正确集成到 Agent
 */

import { registerDefaultToolsAsync } from './src/tool/index.js';
import { ToolRegistry } from './src/tool/registry/ToolRegistry.js';

async function testLspIntegration() {
  console.log('=== LSP Tool Integration Test ===\n');

  try {
    // 注册所有工具（包括 LSP）
    console.log('1. Registering all tools...');
    await registerDefaultToolsAsync();

    // 检查 LSP 工具是否已注册
    console.log('\n2. Checking if LspTool is registered...');
    const allTools = ToolRegistry.getAll();
    const lspTool = ToolRegistry.get('lsp');

    if (!lspTool) {
      console.error('❌ FAILED: LspTool not found in registry!');
      process.exit(1);
    }

    console.log('✅ LspTool found in registry');
    console.log(`   Tool name: ${lspTool.name}`);
    console.log(`   Tool description: ${lspTool.description.substring(0, 100)}...`);

    // 检查工具 schema
    console.log('\n3. Checking tool schema...');
    const schema = lspTool.schema;
    const testParams = {
      operation: 'goToDefinition',
      filePath: 'src/index.ts',
      line: 10,
      character: 15
    };

    const validationResult = schema.safeParse(testParams);
    if (!validationResult.success) {
      console.error('❌ FAILED: Schema validation failed!');
      console.error('   Errors:', validationResult.error.errors);
      process.exit(1);
    }

    console.log('✅ Schema validation passed');
    console.log(`   Test params:`, testParams);

    // 测试工具执行
    console.log('\n4. Testing tool execution (documentSymbol)...');
    const executionResult = await lspTool.execute({
      operation: 'documentSymbol',
      filePath: 'src/tool/lsp.ts',
      line: 1,
      character: 1
    });

    if (!executionResult.success) {
      console.error('❌ FAILED: Tool execution failed!');
      console.error(`   Error: ${executionResult.error}`);
      process.exit(1);
    }

    console.log('✅ Tool execution succeeded');
    console.log(`   Found ${executionResult.data.symbols.length} symbols in lsp.ts`);

    // 检查所有工具列表中是否包含 LSP
    console.log('\n5. Checking all registered tools...');
    const toolNames = allTools.map(t => t.name);
    console.log(`   Total tools registered: ${toolNames.length}`);
    console.log(`   Tool names: ${toolNames.join(', ')}`);

    if (!toolNames.includes('lsp')) {
      console.error('❌ FAILED: LSP not in tool names list!');
      process.exit(1);
    }

    console.log('✅ LSP found in tool names list');

    // 获取工具 schemas（用于 Agent）
    console.log('\n6. Getting tool schemas for Agent...');
    const schemas = ToolRegistry.getSchemas();
    const lspSchema = schemas.find(s => s.name === 'lsp');

    if (!lspSchema) {
      console.error('❌ FAILED: LSP schema not found!');
      process.exit(1);
    }

    console.log('✅ LSP schema found');
    console.log(`   Schema name: ${lspSchema.name}`);
    console.log(`   Schema description: ${lspSchema.description.substring(0, 80)}...`);
    console.log(`   Schema parameters:`, Object.keys(lspSchema.parameters.properties));

    console.log('\n=== All Tests Passed! ===');
    console.log('LSP tool is successfully integrated and ready for use by the Agent.');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testLspIntegration().catch(console.error);
