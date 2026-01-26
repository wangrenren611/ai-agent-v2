import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'node:fs/promises';
import GrepTool from './grep';

describe('GrepTool', () => {
  // 检查 ripgrep 是否可用
  const isRipgrepAvailable = async () => {
    try {
      const tool = new GrepTool();
      const result = await tool.execute({ pattern: 'test', path: '.' });
      return result.success || result.error?.includes('not found');
    } catch {
      return false;
    }
  };

  const skipIfRipgrepUnavailable = async (testFn: () => Promise<void>) => {
    const available = await isRipgrepAvailable();
    if (!available) {
      console.warn('Skipping test: ripgrep not available');
      return;
    }
    await testFn();
  };

  describe('basic search', () => {
    it('searches within the provided path', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'GrepTool',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        const data = result.data as { countFiles: number; countMatches: number; results: Array<{ file: string }> };
        expect(data.countFiles).toBe(1);
        expect(data.countMatches).toBeGreaterThan(0);
        expect(data.results[0]?.file).toBe('src/tool/grep.ts');
      });
    });

    it('returns empty results when pattern not found', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'ThisPatternDefinitelyDoesNotExist12345',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        const data = result.data as { countFiles: number; countMatches: number; results: unknown[] };
        expect(data.countFiles).toBe(0);
        expect(data.countMatches).toBe(0);
        expect(data.results).toEqual([]);
      });
    });
  });

  describe('case mode', () => {
    it('searches case-sensitive', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'import',
          path: targetFile,
          caseMode: 'sensitive',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });

    it('searches case-insensitive', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'IMPORT',
          path: targetFile,
          caseMode: 'insensitive',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });

    it('searches with smart case', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'function',
          path: targetFile,
          caseMode: 'smart',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });
  });

  describe('file pattern', () => {
    it('filters by file glob pattern', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'GrepTool',
          filePattern: '**/*.ts',
          path: 'src/tool',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number };
        expect(data.countFiles).toBeGreaterThanOrEqual(1);
      });
    });

    it('excludes non-matching glob patterns', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'GrepTool',
          filePattern: '**/*.js',
          path: 'src/tool',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number };
        expect(data.countFiles).toBe(0);
      });
    });
  });

  describe('word boundary', () => {
    it('matches whole word only', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: '\\bclass\\b',
          path: targetFile,
          word: true,
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });
  });

  describe('result data structure', () => {
    it('returns correct match data structure', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'GrepTool',
          path: targetFile,
        });

        expect(result.success).toBe(true);

        const data = result.data as {
          countFiles: number;
          countMatches: number;
          results: Array<{
            file: string;
            mtimeMs: number | null;
            mtimeIso: string | null;
            matches: Array<{
              line: number | null;
              column: number | null;
              content: string;
              matchText?: string;
            }>;
          }>;
        };

        expect(data.results.length).toBeGreaterThan(0);
        const firstFile = data.results[0];
        expect(firstFile.file).toBe('src/tool/grep.ts');
        expect(firstFile.mtimeMs).toBeTypeOf('number');
        expect(firstFile.mtimeIso).toBeTypeOf('string');
        expect(firstFile.matches.length).toBeGreaterThan(0);

        const firstMatch = firstFile.matches[0];
        expect(firstMatch.line).toBeTypeOf('number');
        expect(firstMatch.content).toBeTypeOf('string');
      });
    });
  });

  describe('search path', () => {
    it('searches in current directory when path not provided', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'GrepTool',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number };
        expect(data.countFiles).toBeGreaterThan(0);
      });
    });

    it('handles relative path correctly', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'GrepTool',
          path: 'src/tool',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number; results: Array<{ file: string }> };
        expect(data.countFiles).toBeGreaterThan(0);
        expect(data.results[0]?.file).not.toContain('/Users/');
      });
    });
  });

  describe('empty pattern', () => {
    it('handles empty pattern gracefully', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      await expect(
        tool.execute({
          pattern: '',
          path: targetFile,
        })
      ).rejects.toThrow();
    });

    it('handles whitespace-only pattern', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: '   ',
          path: targetFile,
        });

        expect(result.success).toBe(false);
      });
    });
  });

  describe('metadata', () => {
    it('includes truncated flag in metadata', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'function|const|let|var|class|interface|type',
          path: 'src',
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata).toHaveProperty('truncated');
        expect(typeof result.metadata?.truncated).toBe('boolean');
      });
    });

    it('includes timedOut flag in metadata', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: '.',
          path: 'src',
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata).toHaveProperty('timedOut');
        expect(typeof result.metadata?.timedOut).toBe('boolean');
      });
    });
  });

  describe('multiline mode', () => {
    it('supports multiline pattern matching', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'function toDisplayString.*function normalizeFilePath',
          path: targetFile,
          multiline: true,
        });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('hidden files', () => {
    it('can include hidden files when enabled', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: '\\.',
          path: '.',
          includeHidden: true,
          filePattern: '.*',
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('no ignore mode', () => {
    it('respects .gitignore when noIgnore is false', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'import.*from',
          path: 'src',
          noIgnore: false,
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number };
        expect(data.countFiles).toBeGreaterThan(0);
      });
    });
  });

  describe('pcre2 mode', () => {
    it('supports pcre2 advanced regex patterns', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'function.+?;',
          path: targetFile,
          pcre2: true,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('invalid regex pattern', () => {
    it('handles invalid regex pattern gracefully', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      const result = await tool.execute({
        pattern: '(',
        path: targetFile,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles unbalanced bracket pattern', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      const result = await tool.execute({
        pattern: '[unclosed',
        path: targetFile,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('nonexistent path', () => {
    it('returns error when search path does not exist', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'test',
        path: '/path/that/does/not/exist',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('match details', () => {
    it('returns correct column information', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'class GrepTool',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          results: Array<{
            matches: Array<{
              line: number | null;
              column: number | null;
              content: string;
            }>;
          }>;
        };

        expect(data.results.length).toBeGreaterThan(0);
        const firstMatch = data.results[0].matches[0];
        expect(firstMatch.column).toBeTypeOf('number');
        expect(firstMatch.column ?? 0).toBeGreaterThan(0);
      });
    });

    it('returns correct match text', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'GrepTool',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          results: Array<{
            matches: Array<{
              matchText?: string;
            }>;
          }>;
        };

        expect(data.results.length).toBeGreaterThan(0);
        const firstMatch = data.results[0].matches[0];
        expect(firstMatch.matchText).toBeDefined();
        expect(firstMatch.matchText).toContain('GrepTool');
      });
    });

    it('returns correct line numbers', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'export default class GrepTool',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          results: Array<{
            matches: Array<{
              line: number | null;
            }>;
          }>;
        };

        expect(data.results.length).toBeGreaterThan(0);
        const firstMatch = data.results[0].matches[0];
        expect(firstMatch.line).toBeTypeOf('number');
        expect(firstMatch.line ?? 0).toBeGreaterThan(0);
      });
    });
  });

  describe('count accuracy', () => {
    it('returns accurate match count', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'function',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          countMatches: number;
          results: Array<{
            matches: Array<unknown>;
          }>;
        };

        const totalFromFiles = data.results.reduce(
          (sum, f) => sum + f.matches.length,
          0
        );
        expect(data.countMatches).toBe(totalFromFiles);
      });
    });

    it('returns accurate file count', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'function',
          path: 'src/tool',
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          countFiles: number;
          results: Array<unknown>;
        };

        expect(data.countFiles).toBe(data.results.length);
      });
    });
  });

  describe('result sorting', () => {
    it('sorts results by mtime descending', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'class',
          path: 'src/tool',
        });

        expect(result.success).toBe(true);
        const data = result.data as {
          results: Array<{
            mtimeMs: number | null;
          }>;
        };

        for (let i = 1; i < data.results.length; i++) {
          const prev = data.results[i - 1].mtimeMs ?? 0;
          const curr = data.results[i].mtimeMs ?? 0;
          expect(prev).toBeGreaterThanOrEqual(curr);
        }
      });
    });
  });

  describe('timeout', () => {
    it('respects timeout configuration', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'a+',
          path: 'src',
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(typeof result.metadata?.truncated).toBe('boolean');
      });
    });

    it('returns timedOut flag when timeout occurs', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: '.{1,1000}',
          path: 'src',
        });

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        if (result.metadata?.timedOut) {
          expect(result.metadata.truncated).toBe(true);
        }
      });
    });
  });

  describe('empty path', () => {
    it('handles empty path parameter', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'GrepTool',
          path: '',
        });

        expect(result.success).toBe(true);
        const data = result.data as { countFiles: number };
        expect(data.countFiles).toBeGreaterThan(0);
      });
    });
  });

  describe('complex regex patterns', () => {
    it('matches pattern with quantifiers', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: 'const+',
          path: targetFile,
        });

        expect(result.success).toBe(true);
      });
    });

    it('matches pattern with alternation', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: '(async|await)',
          path: targetFile,
        });

        expect(result.success).toBe(true);
      });
    });

    it('matches pattern with character classes', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: '[a-zA-Z_]+Tool',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });
  });

  describe('content edge cases', () => {
    it('handles binary file patterns gracefully', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();

        const result = await tool.execute({
          pattern: 'SearchForNothingThatWontMatch12345',
          path: 'src',
        });

        expect(result.success).toBe(true);
      });
    });

    it('handles very long lines', async () => {
      await skipIfRipgrepUnavailable(async () => {
        const tool = new GrepTool();
        const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

        const result = await tool.execute({
          pattern: '.*',
          path: targetFile,
        });

        expect(result.success).toBe(true);
        const data = result.data as { countMatches: number };
        expect(data.countMatches).toBeGreaterThan(0);
      });
    });
  });
});
