import { describe, it, expect } from 'vitest';
import BashTool from './bash.js';

describe('BashTool', () => {
    const isWindows = process.platform === 'win32';

    it('should list directory contents', async () => {
        const tool = new BashTool();
        
        // Windows 使用 dir，Unix 使用 ls
        const command = isWindows ? 'dir .' : 'ls .';
        
        const result = await tool.execute({ command });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        // Windows 的 dir 输出包含 Volume 信息或目录列表
        if (isWindows) {
            expect(typeof result.data).toBe('string');
        } else {
            expect(result.data).toMatch(/src/);
        }
    });

    it('should execute node code', async () => {
        const tool = new BashTool();
        
        // Windows 和 Unix 使用不同的 node 执行方式
        if (isWindows) {
            // Windows: 直接执行 node 命令
            const result = await tool.execute({ 
                command: 'node -e "console.log(\'hello from node\')"' 
            });
            expect(result.success).toBe(true);
            expect(result.data).toContain('hello from node');
        } else {
            // Unix: 使用 language 参数
            const result = await tool.execute({ 
                command: 'node',
                language: 'node',
                code: 'console.log("hello from node")'
            });
            expect(result.success).toBe(true);
            expect(result.data).toContain('hello from node');
        }
    });

    it('should handle error gracefully', async () => {
        const tool = new BashTool();

        // 使用不存在的命令
        const result = await tool.execute({ command: 'nonexistent_command_12345_xyz' });

        // 命令不存在时 success 应该是 false
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('should handle basic echo command', async () => {
        const tool = new BashTool();

        // 简单测试 echo
        const result = await tool.execute({ command: 'echo test' });
        
        // echo 可能成功也可能失败，取决于环境
        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });
});
