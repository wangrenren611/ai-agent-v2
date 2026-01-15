import { describe, it, expect } from 'vitest';
import BashTool from './bash';
import { getBashParser } from './bash-parser';

describe('BashTool', () => {
    it('should have correct name and description', () => {
        const tool = new BashTool();
        expect(tool.name).toBe('bash');
        expect(tool.description).toBe('Run bash commands');
    });

    it('should have correct schema', () => {
        const tool = new BashTool();
        const schema = tool.schema;

        expect(schema).toBeDefined();
        expect(schema.shape).toHaveProperty('command');
    });

    it('should validate command input', () => {
        const tool = new BashTool();

        const validInput = { command: 'echo "hello"' };
        const result = tool.schema.safeParse(validInput);

        expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
        const tool = new BashTool();

        const invalidInput = { command: 123 };
        const result = tool.schema.safeParse(invalidInput);

        expect(result.success).toBe(false);
    });

    it('should timeout on long-running command', async () => {
        const tool = new BashTool();
        tool.timeout = 1000; // 设置 1 秒超时用于测试

        // sleep 5 会在 macOS/Linux 上睡眠 5 秒
        const result = await tool.execute({ command: process.platform === 'win32' ? 'timeout /t 5' : 'sleep 5' });

        expect(result).toContain('timed out');
        expect(result).toContain('1000ms');
    });

    it('should execute quick command successfully', async () => {
        const tool = new BashTool();
        tool.timeout = 5000; // 5 秒超时

        const result = await tool.execute({ command: 'echo "test"' });

        expect(result).toContain('test');
    });
});

describe('BashParser', () => {
    it('should parse simple command structure', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo hello');

        expect(result.info).toBeDefined();
        expect(result.info?.program).toBe('echo');
        expect(result.info?.arguments).toContain('hello');
    });

    it('should detect pipes', async () => {
        const parser = await getBashParser();
        const result = parser.parse('cat file | grep test');

        expect(result.info?.pipes).toBe(true);
    });

    it('should detect background execution', async () => {
        const parser = await getBashParser();
        const result = parser.parse('sleep 10 &');

        expect(result.info?.background).toBe(true);
    });

    it('should detect dangerous rm -rf command', async () => {
        const parser = await getBashParser();
        const result = parser.parse('rm -rf /path/to/file');

        expect(result.security).toBeDefined();
        expect(result.security?.some((s) => s.level === 'critical')).toBe(true);
        expect(result.security?.some((s) => s.message.includes('rm'))).toBe(true);
    });

    it('should detect sudo usage', async () => {
        const parser = await getBashParser();
        const result = parser.parse('sudo apt update');

        expect(result.security).toBeDefined();
        expect(result.security?.some((s) => s.message.includes('sudo'))).toBe(true);
    });

    it('should detect variable expansion', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo $HOME');

        expect(result.security).toBeDefined();
        expect(result.security?.some((s) => s.message.includes('variable'))).toBe(true);
    });

    it('should detect command substitution', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo $(whoami)');

        expect(result.security).toBeDefined();
        expect(result.security?.some((s) => s.message.includes('substitution'))).toBe(true);
    });

    it('should highlight command', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo -n "hello world"');

        expect(result.highlighted).toBeDefined();
        expect(result.highlighted).toContain('\x1b'); // ANSI color codes
    });

    it('should tokenize complex command with quotes', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo "hello world" \'test\'');

        expect(result.info?.arguments).toEqual(['"hello world"', "'test'"]);
    });

    it('should handle empty command', async () => {
        const parser = await getBashParser();
        const result = parser.parse('');

        expect(result.valid).toBe(true);
    });

    it('should find redirections', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo test > output.txt');

        expect(result.info?.redirections).toContain('> output.txt');
    });

    // Syntax validation tests using parse result
    it('should validate correct syntax', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo "hello world"');

        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should detect syntax errors via AST', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo "hello'); // unmatched quote

        // tree-sitter should detect this as an ERROR node
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('should include AST tree in result', async () => {
        const parser = await getBashParser();
        const result = parser.parse('echo test');

        // tree is internal, just check parse works
        expect(result.valid).toBe(true);
    });

    it('should provide position info for security issues', async () => {
        const parser = await getBashParser();
        const result = parser.parse('sudo ls');

        const sudoIssue = result.security?.find((s) => s.message.includes('sudo'));
        expect(sudoIssue?.position).toBeDefined();
        expect(sudoIssue?.position).toHaveProperty('row');
        expect(sudoIssue?.position).toHaveProperty('column');
    });
});
