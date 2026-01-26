/**
 * ============================================================================
 * File Tool 和 BatchReplace Tool 深度综合测试
 * ============================================================================
 *
 * 测试目标：
 * 1. 测试 ReadFileTool 的各种场景
 * 2. 测试 WriteFileTool 的各种场景
 * 3. 测试 BatchReplaceTool 与 ReadFileTool 的联合使用
 * 4. 测试根据行号修改内容的完整工作流
 *
 * 核心场景：ReadFileTool 读取文件后，BatchReplaceTool 根据指定行修改内容
 */
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ReadFileTool, WriteFileTool } from './file';
import { BatchReplaceTool } from './batch-replace';
import { getBackupManager } from '../util/backup-manager';

// 测试目录和文件路径
const TEST_DIR = path.join(process.cwd(), '.test_file_batch_integration');
const TEST_FILE = path.join(TEST_DIR, 'test.txt');
const TEST_TYPESCRIPT_FILE = path.join(TEST_DIR, 'example.ts');
const TEST_JSON_FILE = path.join(TEST_DIR, 'config.json');
const TEST_CRLF_FILE = path.join(TEST_DIR, 'crlf-file.txt');

// 创建测试工具实例的工厂函数
const createReadFileTool = () => {
  const tool = new ReadFileTool();
  vi.spyOn(tool as any, 'getContext').mockImplementation(() => ({
    environment: process.cwd(),
    platform: process.platform,
    time: new Date().toISOString(),
  }));
  return tool;
};

const createWriteFileTool = () => {
  const tool = new WriteFileTool();
  vi.spyOn(tool as any, 'getContext').mockImplementation(() => ({
    environment: process.cwd(),
    platform: process.platform,
    time: new Date().toISOString(),
  }));
  return tool;
};

const createBatchReplaceTool = () => {
  const tool = new BatchReplaceTool();
  vi.spyOn(tool as any, 'getContext').mockImplementation(() => ({
    environment: process.cwd(),
    platform: process.platform,
    time: new Date().toISOString(),
  }));
  return tool;
};

// 初始化测试目录
beforeAll(() => {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe('File Tool 和 BatchReplace Tool 深度综合测试', () => {
  describe('ReadFileTool 基础测试', () => {
    beforeEach(() => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\nline4\nline5\n', 'utf-8');
    });

    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该能读取整个文件', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE });

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('1 | line1');
      expect(result.data?.content).toContain('5 | line5');
    });

    it('应该能读取指定行范围', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE, startLine: 2, endLine: 4 });

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('2 | line2');
      expect(result.data?.content).toContain('4 | line4');
      expect(result.data?.content).not.toContain('1 | line1');
      expect(result.data?.content).not.toContain('5 | line5');
    });

    it('应该能读取从某行开始到文件末尾', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE, startLine: 3 });

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('3 | line3');
      expect(result.data?.content).toContain('5 | line5');
    });

    it('应该正确返回行号范围信息', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE, startLine: 2, endLine: 4 });

      expect(result.data?.range).toEqual({
        startLine: 2,
        endLine: 4
      });
    });

    it('应该能处理包含特殊字符的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'const str = "hello";\nconst $ = require("jquery");\n中文测试\n', 'utf-8');
      const tool = createReadFileTool();

      const result = await tool.execute({ filePath: TEST_FILE });

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('"hello"');
      expect(result.data?.content).toContain('$');
      expect(result.data?.content).toContain('中文测试');
    });
  });

  describe('ReadFileTool 边界条件和错误处理', () => {
    beforeEach(() => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\n', 'utf-8');
    });

    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该处理文件不存在的情况', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: '/nonexistent/file.txt' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('FILE_NOT_FOUND');
    });

    it('应该处理路径是目录的情况', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_DIR });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PATH_IS_DIRECTORY');
    });

    it('应该处理 startLine 超出文件行数的情况', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE, startLine: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('START_LINE_OUT_OF_RANGE');
    });

    it('应该处理无效的行范围（endLine < startLine）', async () => {
      const tool = createReadFileTool();
      const result = await tool.execute({ filePath: TEST_FILE, startLine: 5, endLine: 2 });

      expect(result.success).toBe(false);
      // 当 startLine >= totalLines 时，返回 START_LINE_OUT_OF_RANGE
      // 因为 startLine (5) 会被计算为 startIndex (4)，而 totalLines 是 3
      expect(result.error).toContain('START_LINE_OUT_OF_RANGE');
    });

    it('应该能处理只有一行的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'single line', 'utf-8');
      const tool = createReadFileTool();

      const result = await tool.execute({ filePath: TEST_FILE });

      expect(result.success).toBe(true);
      expect(result.data?.content).toContain('1 | single line');
    });

    it('应该能处理空文件', async () => {
      fs.writeFileSync(TEST_FILE, '', 'utf-8');
      const tool = createReadFileTool();

      const result = await tool.execute({ filePath: TEST_FILE });

      expect(result.success).toBe(true);
    });
  });

  describe('WriteFileTool 基础测试', () => {
    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该能创建新文件', async () => {
      const tool = createWriteFileTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        content: 'Hello, World!'
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('Hello, World!');
    });

    it('应该能覆盖现有文件', async () => {
      fs.writeFileSync(TEST_FILE, 'old content', 'utf-8');

      const tool = createWriteFileTool();
      const result = await tool.execute({
        filePath: TEST_FILE,
        content: 'new content'
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('new content');
    });

    it('应该能创建嵌套目录的文件', async () => {
      const nestedFile = path.join(TEST_DIR, 'nested', 'dir', 'file.txt');
      const tool = createWriteFileTool();

      const result = await tool.execute({
        filePath: nestedFile,
        content: 'nested file content'
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(nestedFile, 'utf-8')).toBe('nested file content');

      // 清理
      fs.unlinkSync(nestedFile);
      fs.rmdirSync(path.join(TEST_DIR, 'nested', 'dir'));
      fs.rmdirSync(path.join(TEST_DIR, 'nested'));
    });

    it('应该处理包含特殊字符的内容', async () => {
      const tool = createWriteFileTool();
      const content = 'const $ = "test";\n中文内容\n';

      const result = await tool.execute({
        filePath: TEST_FILE,
        content
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe(content);
    });
  });

  describe('WriteFileTool 边界条件和错误处理', () => {
    it('应该处理路径是目录的情况', async () => {
      const tool = createWriteFileTool();
      const result = await tool.execute({
        filePath: TEST_DIR,
        content: 'content'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('PATH_IS_DIRECTORY');
    });

    it('应该能写入空内容', async () => {
      fs.writeFileSync(TEST_FILE, 'old content', 'utf-8');
      const tool = createWriteFileTool();

      const result = await tool.execute({
        filePath: TEST_FILE,
        content: ''
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('');
    });

    it('应该能写入多行内容', async () => {
      const tool = createWriteFileTool();
      const content = 'line1\nline2\nline3\n';

      const result = await tool.execute({
        filePath: TEST_FILE,
        content
      });

      expect(result.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe(content);

      fs.unlinkSync(TEST_FILE);
    });
  });

  describe('核心场景：ReadFileTool + BatchReplaceTool 联合测试', () => {
    beforeEach(() => {
      // 创建一个测试用的 TypeScript 文件
      const tsContent = `interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User | null {
  const users: User[] = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" }
  ];

  return users.find(u => u.id === id) || null;
}

function updateUser(user: User): void {
  console.log("Updating user:", user.name);
}
`;
      fs.writeFileSync(TEST_TYPESCRIPT_FILE, tsContent, 'utf-8');
    });

    afterEach(() => {
      if (fs.existsSync(TEST_TYPESCRIPT_FILE)) {
        fs.unlinkSync(TEST_TYPESCRIPT_FILE);
      }
    });

    it('场景1：读取文件后根据行号修改单行内容', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      // 步骤1：读取文件内容
      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 步骤2：根据读取到的内容，修改第2行
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 2, oldText: '  id: number;', newText: '  id: string;' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(1);

      // 验证修改结果
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('id: string;');
      expect(content).not.toContain('id: number;');
    });

    it('场景2：读取文件后修改多个不连续的行', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      // 读取文件
      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 修改多个不连续的行
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 3, oldText: '  name: string;', newText: '  firstName: string;' },
          { line: 4, oldText: '  email: string;', newText: '  emailAddress: string;' },
          { line: 7, oldText: 'function getUserById', newText: 'function findUserById' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(3);

      // 验证
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('firstName: string;');
      expect(content).toContain('emailAddress: string;');
      expect(content).toContain('function findUserById');
    });

    it('场景3：读取特定行范围后只修改该范围内的行', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      // 只读取第 6-10 行（getUserById 函数）
      const readResult = await readTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        startLine: 6,
        endLine: 10
      });

      expect(readResult.success).toBe(true);
      expect(readResult.data?.range?.startLine).toBe(6);
      expect(readResult.data?.range?.endLine).toBe(10);

      // 修改读取范围内的行
      // 第7行: function getUserById(id: number): User | null {
      // 第8行:   const users: User[] = [
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 7, oldText: 'function getUserById', newText: 'function findUser' },
          { line: 8, oldText: 'const users: User[]', newText: 'const userList: User[]' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);

      // 验证
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('function findUser');
      expect(content).toContain('const userList: User[]');
    });

    it('场景4：读取文件后修改包含特殊字符的行', async () => {
      // 重新创建文件以确保状态一致
      const tsContent = `interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User | null {
  const users: User[] = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" }
  ];

  return users.find(u => u.id === id) || null;
}

function updateUser(user: User): void {
  console.log("Updating user:", user.name);
}
`;
      fs.writeFileSync(TEST_TYPESCRIPT_FILE, tsContent, 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 修改包含特殊字符的内容
      // 第9行:     { id: 1, name: "Alice", email: "alice@example.com" },
      // 第10行:    { id: 2, name: "Bob", email: "bob@example.com" }
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 9, oldText: '"Alice", email: "alice@example.com"', newText: '"Alice Smith", email: "alice.smith@example.com"' },
          { line: 10, oldText: '"Bob", email: "bob@example.com"', newText: '"Bob Johnson", email: "bob.johnson@example.com"' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);

      // 验证
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('Alice Smith');
      expect(content).toContain('Bob Johnson');
    });

    it('场景5：读取文件后进行部分文本替换（不替换整行）', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 只替换类型，保留其他内容
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 2, oldText: 'number', newText: 'string' },
          { line: 7, oldText: 'number', newText: 'string' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);

      // 验证：类型改变了，但结构保留
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('id: string;');
      expect(content).toContain('function getUserById(id: string)');
    });

    it('场景6：读取空行后修改', async () => {
      // 创建包含空行的文件
      fs.writeFileSync(TEST_TYPESCRIPT_FILE, 'line1\n\nline3\n\nline5\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 修改空行为非空
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 2, oldText: '', newText: '  // empty line 1' },
          { line: 4, oldText: '', newText: '  // empty line 2' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);

      // 验证
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('// empty line 1');
      expect(content).toContain('// empty line 2');
    });

    it('场景7：读取 JSON 文件后修改指定行', async () => {
      const jsonContent = `{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}`;
      fs.writeFileSync(TEST_JSON_FILE, jsonContent, 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_JSON_FILE });
      expect(readResult.success).toBe(true);

      // 修改版本号和脚本
      // 第3行:   "version": "1.0.0",
      // 第5行:     "build": "tsc",
      const batchResult = await batchTool.execute({
        filePath: TEST_JSON_FILE,
        replacements: [
          { line: 3, oldText: '  "version": "1.0.0",', newText: '  "version": "2.0.0",' },
          { line: 5, oldText: '    "build": "tsc",', newText: '    "build": "webpack",' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);

      // 验证
      const content = fs.readFileSync(TEST_JSON_FILE, 'utf-8');
      expect(content).toContain('"version": "2.0.0"');
      expect(content).toContain('"build": "webpack"');

      fs.unlinkSync(TEST_JSON_FILE);
    });

    it('场景8：读取文件后同一行多次替换（验证基于原始内容）', async () => {
      // 重新创建文件以确保状态一致
      const tsContent = `interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User | null {
  const users: User[] = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" }
  ];

  return users.find(u => u.id === id) || null;
}

function updateUser(user: User): void {
  console.log("Updating user:", user.name);
}
`;
      fs.writeFileSync(TEST_TYPESCRIPT_FILE, tsContent, 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_TYPESCRIPT_FILE });
      expect(readResult.success).toBe(true);

      // 同一行多次替换
      // 注意：每次替换都基于原始行内容，所以两次都会成功
      // 但最后一次替换会覆盖前面的结果
      const batchResult = await batchTool.execute({
        filePath: TEST_TYPESCRIPT_FILE,
        replacements: [
          { line: 3, oldText: 'name', newText: 'firstName' },
          { line: 3, oldText: 'name', newText: 'fullName' } // 也成功，因为基于原始行
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2); // 两次都成功

      // 验证：最后一次替换生效（覆盖前面的）
      const content = fs.readFileSync(TEST_TYPESCRIPT_FILE, 'utf-8');
      expect(content).toContain('fullName:');
      expect(content).not.toContain('firstName:');
      // 检查原始的 '  name: string;' 是否被修改
      // 由于替换后变成 '  fullName: string;'，所以不应该有 '  name: string;'
      expect(content).not.toContain('  name: string;');
    });
  });

  describe('换行符处理联合测试', () => {
    afterEach(() => {
      if (fs.existsSync(TEST_CRLF_FILE)) {
        fs.unlinkSync(TEST_CRLF_FILE);
      }
    });

    it('应该正确处理 CRLF 换行符的文件', async () => {
      const contentWithCrLf = 'line1\r\nline2\r\nline3\r\n';
      fs.writeFileSync(TEST_CRLF_FILE, contentWithCrLf, 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      // 读取文件
      const readResult = await readTool.execute({ filePath: TEST_CRLF_FILE });
      expect(readResult.success).toBe(true);

      // 修改文件
      const batchResult = await batchTool.execute({
        filePath: TEST_CRLF_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(batchResult.success).toBe(true);

      // 验证：保留 CRLF 换行符
      const content = fs.readFileSync(TEST_CRLF_FILE, 'utf-8');
      expect(content).toBe('line1\r\nmodified\r\nline3\r\n');
    });

    it('应该正确处理混合换行符的文件', async () => {
      // 包含 CRLF 的文件（应被识别为 CRLF）
      const mixedContent = 'line1\r\nline2\r\nline3';
      fs.writeFileSync(TEST_CRLF_FILE, mixedContent, 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_CRLF_FILE });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: TEST_CRLF_FILE,
        replacements: [
          { line: 2, oldText: 'line2', newText: 'modified' }
        ]
      });

      expect(batchResult.success).toBe(true);

      // 验证：保留 CRLF 且不以换行符结尾
      const content = fs.readFileSync(TEST_CRLF_FILE, 'utf-8');
      expect(content).toBe('line1\r\nmodified\r\nline3');
    });
  });

  describe('边界情况：大文件处理', () => {
    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该能处理大型文件的读取和修改', async () => {
      // 创建 1000 行的文件
      const lines: string[] = [];
      for (let i = 0; i < 1000; i++) {
        lines.push(`const variable${i} = ${i};`);
      }
      fs.writeFileSync(TEST_FILE, lines.join('\n') + '\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      // 读取特定范围（第 100-200 行）
      const readResult = await readTool.execute({
        filePath: TEST_FILE,
        startLine: 100,
        endLine: 200
      });

      expect(readResult.success).toBe(true);
      expect(readResult.data?.range?.startLine).toBe(100);
      expect(readResult.data?.range?.endLine).toBe(200);

      // 修改多行
      const replacements = [
        { line: 100, oldText: 'const variable99 = 99;', newText: 'const modified99 = 99;' },
        { line: 150, oldText: 'const variable149 = 149;', newText: 'const modified149 = 149;' },
        { line: 200, oldText: 'const variable199 = 199;', newText: 'const modified200 = 199;' }
      ];

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(3);

      // 验证
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      const contentLines = content.split('\n');
      expect(contentLines[99]).toContain('modified99');
      expect(contentLines[149]).toContain('modified149');
      expect(contentLines[199]).toContain('modified200');
    });

    it('应该能处理大量的替换操作', async () => {
      // 创建 100 行文件
      const lines: string[] = [];
      for (let i = 0; i < 100; i++) {
        lines.push(`line${i}`);
      }
      fs.writeFileSync(TEST_FILE, lines.join('\n') + '\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      // 创建 50 个替换操作
      const replacements = [];
      for (let i = 0; i < 50; i++) {
        replacements.push({
          line: i + 1,
          oldText: `line${i}`,
          newText: `modified${i}`
        });
      }

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(50);

      // 验证部分替换
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('modified0');
      expect(content).toContain('modified10');
      expect(content).toContain('modified48');
    });
  });

  describe('错误处理联合测试', () => {
    beforeEach(() => {
      fs.writeFileSync(TEST_FILE, 'line1\nline2\nline3\n', 'utf-8');
    });

    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该处理读取成功但替换失败的情况', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      // 尝试替换不存在的文本
      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'nonexistent', newText: 'replacement' }
        ]
      });

      expect(batchResult.success).toBe(true); // 有 hasErrors 标记但仍是 success
      expect(batchResult.data?.failedCount).toBe(1);
      expect(batchResult.metadata?.hasErrors).toBe(true);
    });

    it('应该处理部分成功部分失败的情况', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success1' },
          { line: 2, oldText: 'wrong', newText: 'fail1' },
          { line: 3, oldText: 'line3', newText: 'success2' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(2);
      expect(batchResult.data?.failedCount).toBe(1);
    });

    it('应该处理行号越界的情况', async () => {
      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'success' },
          { line: 100, oldText: 'line100', newText: 'fail' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.modifiedCount).toBe(1);
      expect(batchResult.data?.failedCount).toBe(1);
    });
  });

  describe('备份功能联合测试', () => {
    beforeEach(() => {
      fs.writeFileSync(TEST_FILE, 'original content\nline2\nline3\n', 'utf-8');
    });

    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('WriteFileTool 应该在写入前创建备份', async () => {
      const writeTool = createWriteFileTool();
      const backupManager = getBackupManager();
      await backupManager.initialize();

      const backupSpy = vi.spyOn(backupManager, 'backup').mockResolvedValue('backup-write-123');

      const result = await writeTool.execute({
        filePath: TEST_FILE,
        content: 'new content'
      });

      expect(backupSpy).toHaveBeenCalledWith(TEST_FILE);
      expect(result.data?.backupId).toBe('backup-write-123');
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toBe('new content');

      backupSpy.mockRestore();
    });

    it('BatchReplaceTool 应该在修改前创建备份', async () => {
      const batchTool = createBatchReplaceTool();
      const backupManager = getBackupManager();
      await backupManager.initialize();

      const backupSpy = vi.spyOn(backupManager, 'backup').mockResolvedValue('backup-replace-456');

      const result = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'original content', newText: 'modified' }
        ]
      });

      expect(backupSpy).toHaveBeenCalledWith(TEST_FILE);
      expect(result.data?.backupId).toBe('backup-replace-456');

      backupSpy.mockRestore();
    });

    it('应该返回备份信息以便恢复', async () => {
      const batchTool = createBatchReplaceTool();
      const readTool = createReadFileTool();

      // 读取原始内容
      const beforeRead = await readTool.execute({ filePath: TEST_FILE });
      expect(beforeRead.success).toBe(true);

      // 修改文件
      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'original content', newText: 'modified content' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(batchResult.data?.backupId).toBeTruthy();

      // 验证文件已修改
      const afterRead = await readTool.execute({ filePath: TEST_FILE });
      expect(afterRead.data?.content).toContain('modified content');

      // 使用备份 ID 可以恢复文件（这里只验证备份 ID 存在）
      expect(typeof batchResult.data?.backupId).toBe('string');
    });
  });

  describe('特殊字符和编码联合测试', () => {
    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该正确处理包含 $ 符号的文件', async () => {
      fs.writeFileSync(TEST_FILE, 'const $ = require("jquery");\nconst $$ = document.querySelectorAll;\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      // 修改包含 $ 的行
      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: 'const $ = require("jquery");', newText: 'const $ = require("cheerio");' },
          { line: 2, oldText: '$$', newText: '$$$' }
        ]
      });

      expect(batchResult.success).toBe(true);

      // 验证：$ 符号被正确处理
      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('cheerio');
      expect(content).toContain('$$$');
    });

    it('应该正确处理 Unicode 字符', async () => {
      fs.writeFileSync(TEST_FILE, 'const name = "中文";\nconst emoji = "😀";\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '中文', newText: '日本語' },
          { line: 2, oldText: '😀', newText: '🎉' }
        ]
      });

      expect(batchResult.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('日本語');
      expect(content).toContain('🎉');
    });

    it('应该正确处理包含引号的字符串', async () => {
      fs.writeFileSync(TEST_FILE, 'const str1 = "hello";\nconst str2 = \'world\';\nconst str3 = `template`;\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: TEST_FILE });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: TEST_FILE,
        replacements: [
          { line: 1, oldText: '"hello"', newText: '"hi"' },
          { line: 2, oldText: '\'world\'', newText: '\'earth\'' },
          { line: 3, oldText: '`template`', newText: '`literal`' }
        ]
      });

      expect(batchResult.success).toBe(true);

      const content = fs.readFileSync(TEST_FILE, 'utf-8');
      expect(content).toContain('"hi"');
      expect(content).toContain('\'earth\'');
      expect(content).toContain('`literal`');
    });
  });

  describe('路径处理联合测试', () => {
    afterEach(() => {
      if (fs.existsSync(TEST_FILE)) {
        fs.unlinkSync(TEST_FILE);
      }
    });

    it('应该支持相对路径的读写和修改', async () => {
      const relativePath = path.relative(process.cwd(), TEST_FILE);
      fs.writeFileSync(TEST_FILE, 'line1\nline2\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: relativePath });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: relativePath,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'modified' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('modified');
    });

    it('应该支持绝对路径的读写和修改', async () => {
      const absolutePath = path.resolve(TEST_FILE);
      fs.writeFileSync(TEST_FILE, 'line1\nline2\n', 'utf-8');

      const readTool = createReadFileTool();
      const batchTool = createBatchReplaceTool();

      const readResult = await readTool.execute({ filePath: absolutePath });
      expect(readResult.success).toBe(true);

      const batchResult = await batchTool.execute({
        filePath: absolutePath,
        replacements: [
          { line: 1, oldText: 'line1', newText: 'modified' }
        ]
      });

      expect(batchResult.success).toBe(true);
      expect(fs.readFileSync(TEST_FILE, 'utf-8')).toContain('modified');
    });
  });
});
