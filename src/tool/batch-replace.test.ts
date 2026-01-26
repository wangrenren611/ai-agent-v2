/**
 * BatchReplaceTool 测试用例
 *
 * 测试 batch_replace 工具的所有功能：
 * - 成功批量替换
 * - 文件不存在
 * - 行号越界
 * - oldText 不匹配
 * - 空替换数组
 * - 换行符保留（\r\n 和 \n）
 * - 特殊字符处理（$ 符号）
 * - 同一行多次替换
 * - 文件末尾换行符处理
 */
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BatchReplaceTool } from './batch-replace';
import { getBackupManager } from '../util/backup-manager';

// 测试文件路径
const TEST_DIR = path.join(process.cwd(), '.test_batch_replace');
const TEST_FILE = path.join(TEST_DIR, 'test-file.txt');
const TEST_FILE_CRLF = path.join(TEST_DIR, 'test-file-crlf.txt');

// 创建测试工具实例的工厂函数
const createTool = () => {
  const tool = new BatchReplaceTool();
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

describe('BatchReplaceTool', () => {
  beforeEach(() => {
    // 创建默认测试文件（5行，以换行符结尾）
    fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\nline4\nline5\n', 'utf-8');
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(TEST_FILE)) {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\nline4\nline5\n', 'utf-8');
    }
    if (fs.existsSync(TEST_FILE_CRLF)) {
      fs.unlinkSync(TEST_FILE_CRLF);
    }
  });

  describe('基础属性', () => {
    it('应该具有正确的工具名称', () => {
      const tool = new BatchReplaceTool();
      expect(tool.name).toBe('batch_replace');
    });

    it('应该具有正确的描述', () => {
      const tool = new BatchReplaceTool();
      expect(tool.description).toBe('Replace multiple text segments in a single file call.');
    });

    it('应该具有正确的 schema 定义', () => {
      const tool = new BatchReplaceTool();
      expect(tool.schema).toBeDefined();
      expect(tool.schema._def.typeName).toBe('ZodObject');
    });
  });

  describe('成功批量替换场景', () => {
    it('应该成功替换单个替换操作', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified-line2' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(1);
      expect(result.data?.failedCount).toBeUndefined();

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\nmodified-line2\nline3\nline4\nline5\n');
    });

    it('应该成功替换多个替换操作（不同行）', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'first' },
          { line: 3, oldText: 'line3', newText: 'middle' },
          { line: 5, oldText: 'line5', newText: 'last' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(3);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('first\nline2\nmiddle\nline4\nlast\n');
    });

    it('应该只替换每行中第一个匹配的 oldText', async () => {
      fs.writeFileSync(TEST_FILE, 'test test test\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'test', newText: 'TEST' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('TEST test test\nline2');
    });

    it('应该支持替换为空字符串（删除文本）', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: '' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\n\nline3\nline4\nline5\n');
    });

    it('应该支持部分文本替换', async () => {
      fs.writeFileSync(TEST_FILE, 'const name = "test";\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '"test"', newText: '"modified"' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('const name = "modified";\nline2');
    });
  });

  describe('同一行多次替换', () => {
    it('每次替换应基于原始行内容，而非累积替换', async () => {
      fs.writeFileSync(TEST_FILE, 'const x = 1;\nline2', 'utf-8');
      const tool = createTool();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'x', newText: 'y' },
          { line: 1, oldText: 'y', newText: 'z' } // 应该在原始行查找 'y'
        ]
      });

      // 第一个替换成功，第二个替换失败（因为原始行没有 'y'）
      expect(result.success).toBe(true); // 有 hasErrors 标记但仍是 success
      expect(result.data?.modifiedCount).toBe(1);
      expect(result.data?.failedCount).toBe(1);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('const y = 1;\nline2');

      // 验证警告被输出
      const logCalls = consoleSpy.mock.calls.flat();
      expect(logCalls.some(call => call.toString().includes('Multiple replacements'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('应该对同一行的不同部分进行多次替换（注意：基于原始行，后执行的替换会覆盖前面的）', async () => {
      fs.writeFileSync(TEST_FILE, 'const x = 1 + 2;\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'x', newText: 'y' },
          { line: 1, oldText: '1', newText: '10' },
          { line: 1, oldText: '2', newText: '20' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(3);

      // 由于每次替换都基于原始行，并且会覆盖当前行内容
      // 只有最后一次替换（2 -> 20）会被保留
      // 前两次替换（x -> y, 1 -> 10）会被覆盖
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('const x = 1 + 20;\nline2');
    });
  });

  describe('边界条件', () => {
    it('应该能替换第1行', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'first-line' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('first-line');
    });

    it('应该能替换最后一行', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 5, oldText: 'line5', newText: 'last-line' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('last-line');
    });

    it('应该能替换单行文件', async () => {
      fs.writeFileSync(TEST_FILE, 'single-line\n', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'single-line', newText: 'modified' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified\n');
    });

    it('应该处理不以换行符结尾的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      // 不以换行符结尾的文件，修改后仍不应以换行符结尾
      expect(content).toBe('line1\nmodified\nline3');
    });
  });

  describe('错误处理 - 空替换数组', () => {
    it('应该返回空替换数组的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('EMPTY_REPLACEMENTS');
    });
  });

  describe('错误处理 - 文件不存在', () => {
    it('应该返回文件不存在的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: path.join(TEST_DIR, 'non-existent-file.txt'),
        replacements: [
          { line: 1, oldText: 'text', newText: 'newText' }
        ]
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
        replacements: [
          { line: 0, oldText: 'line1', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true); // 部分成功
      expect(result.data?.failedCount).toBe(1);
      expect(result.data?.results[0].message).toContain('out of range');
    });

    it('应该返回行号为负数的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: -1, oldText: 'line1', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
    });

    it('应该返回行号大于有效行数的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 100, oldText: 'line1', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
      expect(result.data?.results[0].message).toContain('out of range');
    });

    it('应该正确处理文件以换行符结尾时的行号', async () => {
      // 文件: "line1\nline2\n" (2行有效内容)
      fs.writeFileSync(TEST_FILE, 'line1\nline2\n', 'utf-8');
      const tool = createTool();

      // 尝试访问第3行（应该失败，因为有效行数是2）
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 3, oldText: '', newText: 'test' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
      expect(result.data?.results[0].message).toContain('file has 2 lines');
    });

    it('应该正确处理文件不以换行符结尾时的行号', async () => {
      // 文件: "line1\nline2" (2行有效内容)
      fs.writeFileSync(TEST_FILE, 'line1\nline2', 'utf-8');
      const tool = createTool();

      // 尝试访问第3行（应该失败）
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 3, oldText: '', newText: 'test' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
      expect(result.data?.results[0].message).toContain('file has 2 lines');
    });
  });

  describe('错误处理 - oldText 不匹配', () => {
    it('应该返回 oldText 不存在的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'non-existent-text', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
      expect(result.data?.results[0].message).toContain('not found');
    });

    it('应该区分大小写', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'LINE2', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
    });

    it('应该返回部分匹配失败的错误', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2-extra', newText: 'newText' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.failedCount).toBe(1);
    });

    it('应该处理混合成功和失败的情况', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success1' },      // 成功
          { line: 2, oldText: 'wrong', newText: 'fail1' },          // 失败
          { line: 3, oldText: 'line3', newText: 'success2' },      // 成功
          { line: 4, oldText: 'wrong-again', newText: 'fail2' },   // 失败
          { line: 5, oldText: 'line5', newText: 'success3' }       // 成功
        ]
      });

      expect(result.success).toBe(true); // 有错误但整体返回 success
      expect(result.data?.modifiedCount).toBe(3);
      expect(result.data?.failedCount).toBe(2);
      expect(result.metadata?.hasErrors).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('success1\nline2\nsuccess2\nline4\nsuccess3\n');
    });
  });

  describe('换行符保留', () => {
    it('应该保留 \\n 换行符', async () => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\n', 'utf-8');
      const tool = createTool();

      await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\nmodified\nline3\n');
    });

    it('应该保留 \\r\\n 换行符', async () => {
      const contentWithCrLf = 'line1\r\nline2\r\nline3\r\n';
      fs.writeFileSync(TEST_FILE_CRLF, contentWithCrLf, 'utf-8');
      const tool = createTool();

      await tool.execute({
        filePath: TEST_FILE_CRLF,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      const content = fs.readFileSync(TEST_FILE_CRLF, 'utf-8');
      // 应该保留 CRLF
      expect(content).toBe('line1\r\nmodified\r\nline3\r\n');
    });

    it('应该正确检测混合换行符文件', async () => {
      // 文件包含 \r\n（应该被识别为 CRLF 文件）
      fs.writeFileSync(TEST_FILE_CRLF, 'line1\r\nline2', 'utf-8');
      const tool = createTool();

      await tool.execute({
        filePath: TEST_FILE_CRLF,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'first' }
        ]
      });

      const content = fs.readFileSync(TEST_FILE_CRLF, 'utf-8');
      expect(content).toBe('first\r\nline2');
    });

    it('应该保留不以换行符结尾的文件格式', async () => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3', 'utf-8');
      const tool = createTool();

      await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('line1\nmodified\nline3');
      expect(content.endsWith('\n')).toBe(false);
    });

    it('应该保留以 \\r\\n 结尾的文件格式', async () => {
      fs.writeFileSync(TEST_FILE_CRLF, 'line1\r\nline2\r\n', 'utf-8');
      const tool = createTool();

      await tool.execute({
        filePath: TEST_FILE_CRLF,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'first' }
        ]
      });

      const content = fs.readFileSync(TEST_FILE_CRLF, 'utf-8');
      expect(content).toBe('first\r\nline2\r\n');
    });
  });

  describe('特殊字符处理', () => {
    it('应该转义 newText 中的 $ 符号', async () => {
      // String.replace() 中 $& 表示匹配的字符串
      // 如果不转义，"abc".replace("a", "$&") 会得到 "aac"
      fs.writeFileSync(TEST_FILE, 'price: $100\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '$100', newText: '$200' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      // 应该得到 "$200" 而不是 "$100200"
      expect(content).toBe('price: $200\nline2');
    });

    it('应该处理包含多个 $ 符号的文本', async () => {
      fs.writeFileSync(TEST_FILE, 'var $a = $b + $c;\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '$a', newText: '$x' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('var $x = $b + $c;\nline2');
    });

    it('应该处理 $$ 转义序列', async () => {
      fs.writeFileSync(TEST_FILE, 'price: $$100\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '$$100', newText: '$$200' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      // $$ 在 newText 中被正确转义为 $$
      // 所以 $$200 -> $$$$ -> 被解释为 $$
      expect(content).toBe('price: $$200\nline2');
    });

    it('应该能处理包含引号的文本', async () => {
      fs.writeFileSync(TEST_FILE, 'const str = "hello";\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '"hello"', newText: '"world"' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('"world"');
    });

    it('应该能处理包含正则特殊字符的文本', async () => {
      fs.writeFileSync(TEST_FILE, 'test[0].value\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '[0]', newText: '[1]' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('test[1].value\nline2');
    });

    it('应该能处理 unicode 字符', async () => {
      fs.writeFileSync(TEST_FILE, '中文测试\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '中文测试', newText: '修改后的内容' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('修改后的内容\nline2');
    });

    it('应该能处理表情符', async () => {
      fs.writeFileSync(TEST_FILE, 'Hello 😀\nline2', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '😀', newText: '🙂' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('Hello 🙂\nline2');
    });
  });

  describe('路径处理', () => {
    it('应该支持相对路径', async () => {
      const tool = createTool();
      const relativePath = path.relative(process.cwd(), TEST_FILE);

      const result = await tool.execute({
        filePath: relativePath,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(result.success).toBe(true);
    });

    it('应该支持绝对路径', async () => {
      const tool = createTool();
      const absolutePath = path.resolve(TEST_FILE);

      const result = await tool.execute({
        filePath: absolutePath,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(result.success).toBe(true);
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
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

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
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(result.data?.backupId).toBe('backup-id-456');
    });
  });

  describe('结果验证', () => {
    it('应该返回详细的替换结果', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success1' },
          { line: 2, oldText: 'wrong', newText: 'fail1' },
          { line: 3, oldText: 'line3', newText: 'success2' }
        ]
      });

      expect(result.data?.results).toHaveLength(3);
      expect(result.data?.results[0]).toEqual({ line: 1, success: true });
      expect(result.data?.results[1]).toEqual({
        line: 2,
        success: false,
        message: expect.stringContaining('not found')
      });
      expect(result.data?.results[2]).toEqual({ line: 3, success: true });
    });

    it('当所有替换都成功时不应有 hasErrors 标记', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success1' },
          { line: 2, oldText: 'line2', newText: 'success2' }
        ]
      });

      expect(result.metadata?.hasErrors).toBeUndefined();
    });

    it('当有替换失败时应有 hasErrors 标记', async () => {
      const tool = createTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success1' },
          { line: 2, oldText: 'wrong', newText: 'fail1' }
        ]
      });

      expect(result.metadata?.hasErrors).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('应该能处理大文件的批量替换', async () => {
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`line-${i}`);
      }
      fs.writeFileSync(TEST_FILE, lines.join('\n') + '\n', 'utf-8');

      const tool = createTool();
      const replacements = [
        { line: 100, oldText: 'line-99', newText: 'modified-99' },
        { line: 500, oldText: 'line-499', newText: 'modified-499' },
        { line: 900, oldText: 'line-899', newText: 'modified-899' }
      ];

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(3);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      const contentLines = content.split('\n');
      expect(contentLines[99]).toBe('modified-99');
      expect(contentLines[499]).toBe('modified-499');
      expect(contentLines[899]).toBe('modified-899');
    });

    it('应该能处理大量替换操作', async () => {
      const lines: string[] = [];
      for (let i = 0; i < 100; i++) {
        lines.push(`line-${i}`);
      }
      fs.writeFileSync(TEST_FILE, lines.join('\n') + '\n', 'utf-8');

      const tool = createTool();
      const replacements = [];
      for (let i = 0; i < 100; i++) {
        replacements.push({
          line: i + 1,
          oldText: `line-${i}`,
          newText: `modified-${i}`
        });
      }

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(100);
    });
  });

  describe('日志输出', () => {
    it('应该输出修改信息', async () => {
      const tool = createTool();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.flat();
      expect(logCalls.some(call => call.toString().includes('[Batch Edit]'))).toBe(true);
      expect(logCalls.some(call => call.toString().includes('Modified'))).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('文件编码', () => {
    it('应该能正确处理 UTF-8 编码的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'café\nnaïve\nstraße\n', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'café', newText: 'restaurant' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('restaurant\nnaïve\nstraße\n');
    });
  });

  describe('边界情况 - 空行和空白字符', () => {
    it('应该能处理包含空行的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'line1\n\nline3\n', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'modified' },
          { line: 2, oldText: '', newText: 'empty-line' },
          { line: 3, oldText: 'line3', newText: 'modified3' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.data?.modifiedCount).toBe(3);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified\nempty-line\nmodified3\n');
    });

    it('应该能处理包含前导空格的行', async () => {
      fs.writeFileSync(TEST_FILE, '  indented line\nline2\n', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '  indented line', newText: '  modified' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('  modified\nline2\n');
    });

    it('应该能处理包含尾随空格的行', async () => {
      fs.writeFileSync(TEST_FILE, 'line with spaces  \nline2\n', 'utf-8');
      const tool = createTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line with spaces  ', newText: 'modified' }
        ]
      });

      expect(result.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toBe('modified\nline2\n');
    });
  });
});
