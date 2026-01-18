import { describe, it, expect } from 'vitest';
import BashTool from './bash';

describe('BashTool', () => {

      it('ai-agent-v2 eeee', async () => {
        const tool = new BashTool();

        // 先 cd 到目标目录（cd 会返回新路径）
        const cdResult = await tool.execute({ command: 'cd D:\\\\work\\\\ai-agent-v2' });
        expect(cdResult).toContain('ai-agent-v2');

        // Windows 使用 dir，Unix 使用 ls
        const lsResult = await tool.execute({ command: 'dir' });

        // 验证输出包含预期内容（目录列表应该包含 common 文件/文件夹）
        expect(lsResult).toMatch(/src/);
        expect(lsResult).toMatch(/package\.json/);
    });
});
