/**
 * LSP Tool Tests
 */

import { describe, it, expect } from 'vitest';
import { LspTool } from './lsp';

describe('LspTool', () => {
  it('should create an LSP tool instance', () => {
    const tool = new LspTool();
    expect(tool.name).toBe('lsp');
    expect(tool.description).toContain('Language Server Protocol');
  });

  it('should have correct schema', () => {
    const tool = new LspTool();
    const schema = tool.schema;

    expect(schema.safeParse({
      operation: 'goToDefinition',
      filePath: 'src/test.ts',
      line: 10,
      character: 15,
    }).success).toBe(true);

    expect(schema.safeParse({
      operation: 'invalid',
      filePath: 'src/test.ts',
      line: 10,
      character: 15,
    }).success).toBe(false);
  });

  it('should support all LSP operations', () => {
    const tool = new LspTool();
    const schema = tool.schema;
    const operations = ['goToDefinition', 'findReferences', 'hover', 'documentSymbol', 'workspaceSymbol'];

    for (const op of operations) {
      expect(schema.safeParse({
        operation: op,
        filePath: 'src/test.ts',
        line: 10,
        character: 15,
      }).success).toBe(true);
    }
  });

  it('should validate line and character are positive', () => {
    const tool = new LspTool();
    const schema = tool.schema;

    expect(schema.safeParse({
      operation: 'goToDefinition',
      filePath: 'src/test.ts',
      line: 0,  // Should fail (must be >= 1)
      character: 15,
    }).success).toBe(false);

    expect(schema.safeParse({
      operation: 'goToDefinition',
      filePath: 'src/test.ts',
      line: 10,
      character: 0,  // Should fail (must be >= 1)
    }).success).toBe(false);
  });
});
