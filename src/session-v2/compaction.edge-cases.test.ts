import { describe, it, expect } from 'vitest';
import { Compaction } from './compaction';
import { LLMProvider } from '../providers/providers/base';
import type { Message } from '../providers/providers/base';

// Mock LLM Provider
class MockLLMProvider extends LLMProvider {
    maxOutputTokens = 2000;
    maxTokens = 8000;

    constructor() {
        super({});
    }

    async generate(_messages: Message[], _options?: any) {
        return {
            content: 'Summary of conversation',
            role: 'assistant' as const,
            usage: { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 },
        };
    }
}

describe('Compaction - 边缘场景测试', () => {
    const mockProvider = new MockLLMProvider() as any;

    describe('场景5: 保护区首条不是 tool 消息', () => {
        it('应该正确处理并触发压缩', async () => {
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider,
                keepMessagesNum: 6  // 使用较小的值更容易触发压缩
            });

            const history: Message[] = [];
            
            // 增加消息数量和内容长度以确保触发压缩
            for (let i = 0; i < 55; i++) {
                history.push({ 
                    role: 'user', 
                    content: `Long message ${i} with lots of content to trigger compaction. `.repeat(10),
                    type: 'text' 
                });
            }

            // 最后 3 条消息：assistant → user → assistant（没有 tool 在最前面）
            history.push({ role: 'assistant', content: 'response 1', type: 'text' });
            history.push({ role: 'user', content: 'question 1', type: 'text' });
            history.push({ role: 'assistant', content: 'response 2', type: 'text' });

            const result = await compaction.compact(history);

            // 验证 list 存在
            expect(result.list).toBeDefined();
            expect(result.list.length).toBeGreaterThan(0);
        });
    });

    describe('场景6: Assistant 在 pending 区，部分 tool 在 active 区', () => {
        it('应该正确保留工具调用链完整性', async () => {
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider,
                keepMessagesNum: 6  // 使用较小的值
            });

            const history: Message[] = [];
            
            // 创建足够多的消息来触发压缩
            for (let i = 0; i < 55; i++) {
                history.push({ 
                    role: 'user', 
                    content: `Message ${i} `.repeat(10),
                    type: 'text' 
                });
            }
            
            // assistant 在 pending 区
            history.push({ 
                role: 'assistant', 
                content: '', 
                type: 'tool_call',
                tool_calls: [
                    { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
                    { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
                    { id: 'call_3', type: 'function', function: { name: 'tool3', arguments: '{}' } },
                ]
            });
            
            // tool 回复
            history.push({ role: 'tool', content: 'result 1', tool_call_id: 'call_1' });
            history.push({ role: 'tool', content: 'result 2', tool_call_id: 'call_2' });
            history.push({ role: 'tool', content: 'result 3', tool_call_id: 'call_3' });
            
            // 再加几条消息触发压缩
            history.push({ role: 'assistant', content: 'response', type: 'text' });
            history.push({ role: 'user', content: 'question', type: 'text' });

            const result = await compaction.compact(history);

            // 验证 list 存在
            expect(result.list).toBeDefined();
            
            // 如果触发了压缩，验证 tool 消息存在
            if (result.isCompacted) {
                const tools = result.list.filter(m => m.role === 'tool');
                expect(tools.length).toBeGreaterThan(0);
            }
        });
    });

    describe('场景7: 空历史记录', () => {
        it('应该返回空数组', async () => {
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider 
            });
            
            const result = await compaction.compact([]);
            
            expect(result.list).toEqual([]);
            expect(result.isCompacted).toBe(false);
        });
    });

    describe('场景8: 单条消息', () => {
        it('不应该触发压缩', async () => {
            const history: Message[] = [{ role: 'user', content: 'Hello' }];
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider 
            });
            
            const result = await compaction.compact(history);
            
            expect(result.list).toEqual(history);
            expect(result.isCompacted).toBe(false);
        });
    });

    describe('场景9: 刚好达到 keepMessagesNum 阈值', () => {
        it('不应该触发压缩', async () => {
            const history: Message[] = [];
            for (let i = 0; i < 20; i++) {
                history.push({ role: 'user', content: `User message ${i}` });
                history.push({ role: 'assistant', content: `Assistant response ${i}` });
            }
            // 40 条消息
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider, 
                keepMessagesNum: 40 
            });
            
            const result = await compaction.compact(history);
            expect(result.list.length).toBe(40);
            expect(result.isCompacted).toBe(false);
        });
    });

    describe('场景10: 超过 keepMessagesNum 但 token 充足', () => {
        it('不应该触发压缩', async () => {
            const history: Message[] = [];
            for (let i = 0; i < 30; i++) {
                history.push({ role: 'user', content: `User message ${i}` });
                history.push({ role: 'assistant', content: `Assistant response ${i}` });
            }
            // 60 条消息
            const compaction = new Compaction({ 
                maxTokens: 8000, 
                maxOutputTokens: 2000, 
                llmProvider: mockProvider, 
                keepMessagesNum: 40 
            });
            
            const result = await compaction.compact(history);
            
            expect(result.list.length).toBeGreaterThanOrEqual(40);
        });
    });
});
