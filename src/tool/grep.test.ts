import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'node:fs/promises';
import GrepTool from './grep';

describe('GrepTool', () => {
  // === 基本搜索测试 ===
  describe('basic search', () => {
    it('searches within the provided path', async () => {
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

    it('returns empty results when pattern not found', async () => {
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

  // === 大小写模式测试 ===
  describe('case mode', () => {
    it('searches case-sensitive', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 'import' 小写应该能找到
      const result = await tool.execute({
        pattern: 'import',
        path: targetFile,
        caseMode: 'sensitive',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countMatches: number };
      expect(data.countMatches).toBeGreaterThan(0);
    });

    it('searches case-insensitive', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 'IMPORT' 大写在 case-insensitive 模式下应该能找到
      const result = await tool.execute({
        pattern: 'IMPORT',
        path: targetFile,
        caseMode: 'insensitive',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countMatches: number };
      expect(data.countMatches).toBeGreaterThan(0);
    });

    it('searches with smart case', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // smart-case: 全小写时大小写不敏感
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

  // === 文件模式过滤测试 ===
  describe('file pattern', () => {
    it('filters by file glob pattern', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'GrepTool',
        filePattern: '**/*.ts',
        path: 'src/tool',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number };

      // 只应该匹配 .ts 文件
      expect(data.countFiles).toBeGreaterThanOrEqual(1);
    });

    it('excludes non-matching glob patterns', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'GrepTool',
        filePattern: '**/*.js',
        path: 'src/tool',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number };

      // .js 文件不应该匹配
      expect(data.countFiles).toBe(0);
    });
  });

  // === 全词匹配测试 ===
  describe('word boundary', () => {
    it('matches whole word only', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 'class' 单独成词应该能匹配
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

  // === 搜索结果数据格式测试 ===
  describe('result data structure', () => {
    it('returns correct match data structure', async () => {
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

  // === 搜索路径测试 ===
  describe('search path', () => {
    it('searches in current directory when path not provided', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'GrepTool',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number };
      expect(data.countFiles).toBeGreaterThan(0);
    });

    it('handles relative path correctly', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'GrepTool',
        path: 'src/tool',
      });

      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number; results: Array<{ file: string }> };
      expect(data.countFiles).toBeGreaterThan(0);
      // 相对路径应该被标准化为相对路径格式
      expect(data.results[0]?.file).not.toContain('/Users/');
    });
  });

  // === 空 pattern 测试 ===
  describe('empty pattern', () => {
    it('handles empty pattern gracefully', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 空字符串在 Zod 验证阶段会被拒绝，抛出 ZodError
      // 验证 schema 正确地拒绝了空 pattern
      await expect(
        tool.execute({
          pattern: '',
          path: targetFile,
        })
      ).rejects.toThrow();
    });

    it('handles whitespace-only pattern', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      const result = await tool.execute({
        pattern: '   ',
        path: targetFile,
      });

      expect(result.success).toBe(false);
    });
  });

  // === 元数据测试 ===
  describe('metadata', () => {
    it('includes truncated flag in metadata', async () => {
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

    it('includes timedOut flag in metadata', async () => {
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

  // === 多行模式测试 ===
  describe('multiline mode', () => {
    it('supports multiline pattern matching', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 多行模式测试
      const result = await tool.execute({
        pattern: 'function toDisplayString.*function normalizeFilePath',
        path: targetFile,
        multiline: true,
      });

      // 预期可能没有多行匹配，但应该成功执行
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // === 包含隐藏文件测试 ===
  describe('hidden files', () => {
    it('can include hidden files when enabled', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: '\\.',
        path: '.',
        includeHidden: true,
        filePattern: '.*',
      });

      // 搜索隐藏文件不应该报错
      expect(result.success).toBe(true);
    });
  });

  // === noIgnore 模式测试 ===
  describe('no ignore mode', () => {
    it('respects .gitignore when noIgnore is false', async () => {
      const tool = new GrepTool();

      // 搜索整个目录，node_modules 应该在 ignoreGlobs 中被排除
      const result = await tool.execute({
        pattern: 'import.*from',
        path: 'src',
        noIgnore: false,
      });

      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number };

      // src 目录下应该有匹配
      expect(data.countFiles).toBeGreaterThan(0);
    });
  });

  // === PCRE2 模式测试 ===
  describe('pcre2 mode', () => {
    it('supports pcre2 advanced regex patterns', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 使用 PCRE2 支持的非贪婪匹配
      const result = await tool.execute({
        pattern: 'function.+?;',
        path: targetFile,
        pcre2: true,
      });

      // 应该能成功执行
      expect(result.success).toBe(true);
    });
  });

  // === 无效正则表达式测试 ===
  describe('invalid regex pattern', () => {
    it('handles invalid regex pattern gracefully', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 无效的正则表达式 - 未闭合的括号
      const result = await tool.execute({
        pattern: '(',
        path: targetFile,
      });

      // 无效正则应该返回失败
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

  // === 搜索路径不存在测试 ===
  describe('nonexistent path', () => {
    it('returns error when search path does not exist', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'test',
        path: '/path/that/does/not/exist',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // 错误信息中应该包含路径不存在的信息
      expect(result.error).toContain('SEARCH_PATH_NOT_FOUND');
    });
  });

  // === 匹配详细信息测试 ===
  describe('match details', () => {
    it('returns correct column information', async () => {
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
      // 列号应该大于 0
      expect(firstMatch.column).toBeTypeOf('number');
      expect(firstMatch.column ?? 0).toBeGreaterThan(0);
    });

    it('returns correct match text', async () => {
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
      // matchText 应该包含匹配的文本
      expect(firstMatch.matchText).toBeDefined();
      expect(firstMatch.matchText).toContain('GrepTool');
    });

    it('returns correct line numbers', async () => {
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
      // 行号应该是有效的正整数
      expect(firstMatch.line).toBeTypeOf('number');
      expect(firstMatch.line ?? 0).toBeGreaterThan(0);
    });
  });

  // === 结果统计测试 ===
  describe('count accuracy', () => {
    it('returns accurate match count', async () => {
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

      // 总匹配数应该等于所有文件匹配数的总和
      const totalFromFiles = data.results.reduce(
        (sum, f) => sum + f.matches.length,
        0
      );
      expect(data.countMatches).toBe(totalFromFiles);
    });

    it('returns accurate file count', async () => {
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

      // 文件数应该等于结果数组长度
      expect(data.countFiles).toBe(data.results.length);
    });
  });

  // === 结果排序测试 ===
  describe('result sorting', () => {
    it('sorts results by mtime descending', async () => {
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

      // 验证结果按 mtime 降序排序
      for (let i = 1; i < data.results.length; i++) {
        const prev = data.results[i - 1].mtimeMs ?? 0;
        const curr = data.results[i].mtimeMs ?? 0;
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  // === 超时测试 ===
  describe('timeout', () => {
    it('respects timeout configuration', async () => {
      const tool = new GrepTool();

      // 使用一个会匹配大量结果的模式
      const result = await tool.execute({
        pattern: 'a+',
        path: 'src',
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      // 超时后结果可能被截断
      expect(typeof result.metadata?.truncated).toBe('boolean');
    });

    it('returns timedOut flag when timeout occurs', async () => {
      const tool = new GrepTool();

      // 创建一个超时很短的测试用例
      const result = await tool.execute({
        pattern: '.{1,1000}',
        path: 'src',
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      // 大量匹配可能会触发超时
      if (result.metadata?.timedOut) {
        expect(result.metadata.truncated).toBe(true);
      }
    });
  });

  // === 空路径测试 ===
  describe('empty path', () => {
    it('handles empty path parameter', async () => {
      const tool = new GrepTool();

      const result = await tool.execute({
        pattern: 'GrepTool',
        path: '',
      });

      // 空路径应该回退到当前目录
      expect(result.success).toBe(true);
      const data = result.data as { countFiles: number };
      expect(data.countFiles).toBeGreaterThan(0);
    });
  });

  // === 复杂正则表达式测试 ===
  describe('complex regex patterns', () => {
    it('matches pattern with quantifiers', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      const result = await tool.execute({
        pattern: 'const+',
        path: targetFile,
      });

      expect(result.success).toBe(true);
    });

    it('matches pattern with alternation', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      const result = await tool.execute({
        pattern: '(async|await)',
        path: targetFile,
      });

      expect(result.success).toBe(true);
    });

    it('matches pattern with character classes', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 搜索以 [a-z]+ 模式匹配的单词
      const result = await tool.execute({
        pattern: '[a-zA-Z_]+Tool',
        path: targetFile,
      });

      expect(result.success).toBe(true);
      const data = result.data as { countMatches: number };
      expect(data.countMatches).toBeGreaterThan(0);
    });
  });

  // === 内容边界情况测试 ===
  describe('content edge cases', () => {
    it('handles binary file patterns gracefully', async () => {
      const tool = new GrepTool();

      // 搜索二进制模式不应该崩溃，应该返回成功（可能无结果）
      // ripgrep 默认会跳过二进制文件
      const result = await tool.execute({
        pattern: 'SearchForNothingThatWontMatch12345',
        path: 'src',
      });

      // 应该成功执行，即使没有匹配结果
      expect(result.success).toBe(true);
    });

    it('handles very long lines', async () => {
      const tool = new GrepTool();
      const targetFile = path.resolve(process.cwd(), 'src/tool/grep.ts');

      // 搜索包含长行的文件
      const result = await tool.execute({
        pattern: '.*',
        path: targetFile,
      });

      expect(result.success).toBe(true);
      const data = result.data as { countMatches: number };
      // 应该能处理长行
      expect(data.countMatches).toBeGreaterThan(0);
    });
  });
});
