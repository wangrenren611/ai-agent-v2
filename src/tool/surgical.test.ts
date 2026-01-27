/**
 * SurgicalEditTool 测试用例
 *
 * 测试 precise_replace 工具的所有功能：
 * - 成功替换
 * - 文件不存在
 * - 行号越界
 * - oldText 不匹配
 * - 边界条件（第1行、最后一行）
 * - 相对/绝对路径
 */
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SurgicalEditTool } from './surgical.js';
import { getBackupManager } from '../util/backup-manager.js';

// 测试文件路径
const TEST_DIR = path.join(process.cwd(), '.test_surgical');
const TEST_FILE = path.join(TEST_DIR, 'test-file.txt');

// 创建测试工具实例的工厂函数
const createTool = () => {
  const tool = new SurgicalEditTool();
  // 使用 mockImplementation 替换 getContext 方法
  vi.spyOn(tool as any, 'getContext').mockImplementation(() => ({
    environment: process.cwd(),
    platform: process.platform,
    time: new Date().toISOString(),
  }));
  return tool;
};

// 初始化测试目录和文件
beforeAll(() => {
  // 创建测试目录
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  // 清理测试目录
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('SurgicalEditTool', () => {
  beforeEach(() => {
    // 创建测试文件（默认5行）
    fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\nline4\nline5', 'utf-8');
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(TEST_FILE)) {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\nline4\nline5', 'utf-8');
    }
  });

  describe('基础属性', () => {
    it('应该具有正确的工具名称', () => {
      const tool = new SurgicalEditTool();
      expect(tool.name).toBe('precise_replace');
    });

    it('应该具有正确的描述', () => {
      const tool = new SurgicalEditTool();
      expect(tool.description).toContain('Precise code replacement');
      expect(tool.description).toContain('line numbers');
      expect(tool.description).toContain('exact text');
    });

    it('应该具有正确的 schema 定义', () => {
      const tool = new SurgicalEditTool();
      expect(tool.schema).toBeDefined();
      expect(tool.schema._def.typeName).toBe('ZodObject');
    });
  });

  describe('成功替换场景', () => {
    it('应该成功替换指定行的文本', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2',
        newText: 'modified-line2',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      // 验证文件内容
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\nmodified-line2\nline3\nline4\nline5');
    });

    it('应该只替换部分文本（保留行的其他内容）', async () => {
      // 创建包含分号的测试文件
      fs.writeFileSync(TEST_FILE, 'const name = "test";\nline2\nline3', 'utf-8');
      const tool = createTool();

      // 注意：oldText 必须完全匹配该行中要替换的部分
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '"test"',
        newText: '"modified"',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('const name = "modified";\nline2\nline3');
    });

    it('应该支持替换为空字符串（删除文本）', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2',
        newText: '',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\n\nline3\nline4\nline5');
    });

    it('应该支持替换为空字符串的一部分（保留部分内容）', async () => {
      fs.writeFileSync(TEST_FILE, 'const greeting = "Hello, World!";\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: ', World!',
        newText: '',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('const greeting = "Hello";\nline2');
    });

    it('应该支持替换为多行文本', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2',
        newText: 'line2-a\nline2-b\nline2-c',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\nline2-a\nline2-b\nline2-c\nline3\nline4\nline5');
    });
  });

  describe('边界条件', () => {
    it('应该能替换第1行', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'line1',
        newText: 'first-line',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content.startsWith('first-line')).toBe(true);
    });

    it('应该能替换最后一行', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 5,
        oldText: 'line5',
        newText: 'last-line',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content.endsWith('last-line')).toBe(true);
    });

    it('应该能替换只有一行的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'single-line', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'single-line',
        newText: 'modified-single',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified-single');
    });

    it('空文件时可以匹配空行', async () => {
      fs.writeFileSync(TEST_FILE, '', 'utf-8');
      const tool = createTool();

      // 空文件有一行（空行）
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '', // 匹配空行
        newText: 'new-content',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('new-content');
    });

    it('应该能处理包含重复文本的行', async () => {
      fs.writeFileSync(TEST_FILE, 'test test test\nline2', 'utf-8');
      const tool = createTool();

      // 只替换第一个 "test"
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'test',
        newText: 'TEST',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('TEST test test\nline2');
    });
  });

  describe('错误处理 - 文件不存在', () => {
    it('应该返回文件不存在的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: path.join(TEST_DIR, 'non-existent-file.txt'),
        line: 1,
        oldText: 'text',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('FILE_NOT_FOUND');
    });

    it('应该处理相对路径的文件不存在', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: './non-existent-dir/file.txt',
        line: 1,
        oldText: 'text',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('FILE_NOT_FOUND');
    });
  });

  describe('错误处理 - 行号越界', () => {
    it('应该返回行号小于1的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 0,
        oldText: 'line1',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LINE_OUT_OF_RANGE');
    });

    it('应该返回行号为负数的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: -1,
        oldText: 'line1',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LINE_OUT_OF_RANGE');
    });

    it('应该返回行号大于总行数的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 100,
        oldText: 'line1',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LINE_OUT_OF_RANGE');
    });

    it('应该返回行号恰好等于总行数+1的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 6,
        oldText: 'line1',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('LINE_OUT_OF_RANGE');
    });
  });

  describe('错误处理 - oldText 不匹配', () => {
    it('应该返回 oldText 不存在的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'non-existent-text',
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TEXT_NOT_FOUND');
      expect(result.metadata?.expectedText).toBe('non-existent-text');
    });

    it('应该返回大小写不匹配的错误（区分大小写）', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'LINE2', // 大写，实际是小写
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TEXT_NOT_FOUND');
    });

    it('应该返回完全不匹配的错误', async () => {
      fs.writeFileSync(TEST_FILE, '  indented line\nline2', 'utf-8');
      const tool = createTool();

      // 使用完全不存在的文本
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'completely non-existent text',
        newText: 'modified',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TEXT_NOT_FOUND');
    });

    it('应该处理包含前导空格的行', async () => {
      fs.writeFileSync(TEST_FILE, '  indented line\nline2', 'utf-8');
      const tool = createTool();

      // 精确匹配带空格的文本
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '  indented line', // 带前导空格
        newText: 'modified',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified\nline2');
    });

    it('应该返回部分匹配失败的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2-extra', // 包含额外字符
        newText: 'newText',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('TEXT_NOT_FOUND');
    });
  });

  describe('路径处理', () => {
    it('应该支持相对路径', async () => {
      const tool = createTool();
      const relativePath = path.relative(process.cwd(), TEST_FILE);

      const result = await tool.execute({
        filePath: relativePath,
        line: 2,
        oldText: 'line2',
        newText: 'modified',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');
    });

    it('应该支持绝对路径', async () => {
      const tool = createTool();
      const absolutePath = path.resolve(TEST_FILE);

      const result = await tool.execute({
        filePath: absolutePath,
        line: 2,
        oldText: 'line2',
        newText: 'modified',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');
    });

    it('应该支持 ./ 前缀的路径', async () => {
      const tool = createTool();
      const relativePath = '.' + path.sep + path.relative(process.cwd(), TEST_FILE);

      const result = await tool.execute({
        filePath: relativePath,
        line: 2,
        oldText: 'line2',
        newText: 'modified',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');
    });
  });

  describe('备份功能', () => {
    it('应该在修改前创建备份', async () => {
      const tool = createTool();
      const backupManager = getBackupManager();
      await backupManager.initialize();
      vi.spyOn(backupManager, 'backup').mockResolvedValue('backup-test-123');

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2',
        newText: 'modified',
      });

      // 验证备份函数被调用
      expect(backupManager.backup).toHaveBeenCalledWith(TEST_FILE);
      expect(result.data?.backupId).toBe('backup-test-123');
    });

    it('应该在返回结果中包含备份信息', async () => {
      const tool = createTool();
      const backupManager = getBackupManager();
      await backupManager.initialize();
      vi.spyOn(backupManager, 'backup').mockResolvedValue('backup-id-456');

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 2,
        oldText: 'line2',
        newText: 'modified',
      });

      expect(result.data?.backupId).toBe('backup-id-456');
      expect(result.data?.message).toContain('backup-id-456');
    });
  });

  describe('特殊字符处理', () => {
    it('应该能处理包含引号的文本', async () => {
      fs.writeFileSync(TEST_FILE, 'const str = "hello";\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '"hello"',
        newText: '"world"',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('"world"');
    });

    it('应该能处理包含正则特殊字符的文本', async () => {
      fs.writeFileSync(TEST_FILE, 'test[0].value\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '[0]',
        newText: '[1]',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('test[1].value\nline2');
    });

    it('应该能处理 unicode 字符', async () => {
      fs.writeFileSync(TEST_FILE, '中文测试\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '中文测试',
        newText: '修改后的内容',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('修改后的内容\nline2');
    });

    it('应该能处理表情符', async () => {
      fs.writeFileSync(TEST_FILE, 'Hello 😀\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '😀',
        newText: '🙂',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('Hello 🙂\nline2');
    });
  });

  describe('并发安全', () => {
    it('应该能处理多个并发修改请求（不同行）', async () => {
      const tool1 = createTool();
      const tool2 = createTool();

      // 并发修改不同行
      const [result1, result2] = await Promise.all([
        tool1.execute({
          filePath: TEST_FILE,
          line: 1,
          oldText: 'line1',
          newText: 'modified-1',
        }),
        tool2.execute({
          filePath: TEST_FILE,
          line: 3,
          oldText: 'line3',
          newText: 'modified-3',
        }),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified-1\nline2\nmodified-3\nline4\nline5');
    });

    it('应该能处理修改同一行的并发请求（后一个会失败）', async () => {
      const tool1 = createTool();
      const tool2 = createTool();

      // 先恢复测试文件
      fs.writeFileSync(TEST_FILE, 'original\nline2\nline3', 'utf-8');

      // 第一个请求成功
      const result1 = await tool1.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'original',
        newText: 'first-mod',
      });

      // 第二个请求会因为 oldText 不匹配而失败
      const result2 = await tool2.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'original', // 已经被修改
        newText: 'second-mod',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('TEXT_NOT_FOUND');
    });
  });

  describe('文件编码', () => {
    it('应该能正确处理 UTF-8 编码的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'café\nnaïve\nstraße', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'café',
        newText: 'restaurant',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('restaurant\nnaïve\nstraße');
    });

    it('应该能处理带 BOM 的 UTF-8 文件 - BOM 会作为内容的一部分', async () => {
      const contentWithBOM = '\uFEFFline1\nline2\nline3';
      fs.writeFileSync(TEST_FILE, contentWithBOM, 'utf-8');
      const tool = createTool();

      // BOM 会作为文件第一行的一部分
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: '\uFEFFline1', // 必须包含 BOM
        newText: 'modified',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');
    });
  });

  describe('性能测试', () => {
    it('应该能处理大文件的单行替换', async () => {
      // 创建大文件
      const lines: string[] = [];
      for (let i = 0; i < 10000; i++) {
        lines.push(`line-${i}`);
      }
      fs.writeFileSync(TEST_FILE, lines.join('\n'), 'utf-8');

      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 5000,
        oldText: 'line-4999',
        newText: 'modified-line',
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      const contentLines = content.split('\n');
      expect(contentLines[4999]).toBe('modified-line');
    });

    it('应该能处理长行的替换', async () => {
      const longLine = 'a'.repeat(10000);
      fs.writeFileSync(TEST_FILE, longLine + '\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'a'.repeat(100),
        newText: 'b'.repeat(100),
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toContain('Modification successful');

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content.startsWith('b'.repeat(100) + 'a'.repeat(9900))).toBe(true);
    });
  });

  describe('日志输出', () => {
    it('应该输出修改后的行内容', async () => {
      fs.writeFileSync(TEST_FILE, 'console.log("test");\nline2', 'utf-8');
      const tool = createTool();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await tool.execute({
        filePath: TEST_FILE,
        line: 1,
        oldText: 'console.log("test")',
        newText: 'console.error("error")',
      });

      // 验证日志输出
      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.flat();
      expect(logCalls.some(call => call.toString().includes('[Edit]'))).toBe(true);
    });
  });
});
