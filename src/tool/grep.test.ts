import { describe, it, expect } from 'vitest';
import path from 'path';
import GrepTool from './grep';

describe('GrepTool', () => {
  it('searches within the provided path', async () => {
    const tool = new GrepTool();
    const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

    const result = await tool.execute({
      pattern: 'GrepTool',
      path: targetFile,
    });

    if (typeof result === 'string') {
      throw new Error('Expected structured output');
    } 
    console.log(result);
    expect(result.metadata.ok).toBe(true);
    expect(result.metadata.countFiles).toBe(1);
    expect(result.metadata.countMatches).toBeGreaterThan(0);
    expect(result.metadata.result?.[0]?.file).toBe('src/tool/grep.ts');
  });


});
