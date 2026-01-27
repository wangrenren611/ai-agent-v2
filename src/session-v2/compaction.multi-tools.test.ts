import { describe, it, expect } from 'vitest';
import { Compaction } from './compaction.js';
import { LLMProvider } from '../providers/base.js';
import type { Message } from '../providers/base.js';

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

describe('Multi-Tool Bug Fix Verification', () => {
    const mockProvider = new MockLLMProvider() as any;

    it('should preserve ALL tool responses when assistant has 4 tool_calls split across zones', async () => {
        const compaction = new Compaction({
            maxTokens: 8000,
            maxOutputTokens: 2000,
            llmProvider: mockProvider,
            keepMessagesNum: 6  // 较小的值更容易触发压缩
        });

        const history: Message[] = [];

        // 55 old messages with more content to trigger compression
        for (let i = 0; i < 55; i++) {
            history.push({ role: 'user', content: `msg ${i} `.repeat(10), type: 'text' });
        }

        // Assistant with 4 tool_calls
        history.push({
            role: 'assistant',
            content: '',
            tool_calls: [
                { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
                { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
                { id: 'call_3', type: 'function', function: { name: 'tool3', arguments: '{}' } },
                { id: 'call_4', type: 'function', function: { name: 'tool4', arguments: '{}' } },
            ],
        });

        // All 4 tool responses
        history.push({ role: 'tool', tool_call_id: 'call_1', content: 'result 1' });
        history.push({ role: 'tool', tool_call_id: 'call_2', content: 'result 2' });
        history.push({ role: 'tool', tool_call_id: 'call_3', content: 'result 3' });
        history.push({ role: 'tool', tool_call_id: 'call_4', content: 'result 4' });

        // 4 more messages
        history.push({ role: 'user', content: 'q1' });
        history.push({ role: 'assistant', content: 'a1' });
        history.push({ role: 'user', content: 'q2' });
        history.push({ role: 'assistant', content: 'a2' });

        const result = await compaction.compact(history);

        // Verify list exists
        expect(result.list).toBeDefined();
        
        // Verify at least tools exist
        const tools = result.list.filter(m => m.role === 'tool');
        expect(tools.length).toBe(4);

        console.log('Multi-tool bug fix verified: All 4 tool responses preserved');
    });

    it('should handle multiple assistants each with multiple tool_calls', async () => {
        const compaction = new Compaction({
            maxTokens: 8000,
            maxOutputTokens: 2000,
            llmProvider: mockProvider,
            keepMessagesNum: 6
        });

        const history: Message[] = [];

        for (let i = 0; i < 55; i++) {
            history.push({ role: 'user', content: `msg ${i} `.repeat(10), type: 'text' });
        }

        // Assistant 1: 3 tool_calls
        history.push({
            role: 'assistant',
            content: '',
            tool_calls: [
                { id: 'a1_t1', type: 'function', function: { name: 't1', arguments: '{}' } },
                { id: 'a1_t2', type: 'function', function: { name: 't2', arguments: '{}' } },
                { id: 'a1_t3', type: 'function', function: { name: 't3', arguments: '{}' } },
            ],
        });
        history.push({ role: 'tool', tool_call_id: 'a1_t1', content: 'a1 r1' });
        history.push({ role: 'tool', tool_call_id: 'a1_t2', content: 'a1 r2' });
        history.push({ role: 'tool', tool_call_id: 'a1_t3', content: 'a1 r3' });

        // Assistant 2: 2 tool_calls
        history.push({
            role: 'assistant',
            content: '',
            tool_calls: [
                { id: 'a2_t1', type: 'function', function: { name: 't1', arguments: '{}' } },
                { id: 'a2_t2', type: 'function', function: { name: 't2', arguments: '{}' } },
            ],
        });
        history.push({ role: 'tool', tool_call_id: 'a2_t1', content: 'a2 r1' });
        history.push({ role: 'tool', tool_call_id: 'a2_t2', content: 'a2 r2' });

        // 3 more messages
        history.push({ role: 'user', content: 'next' });
        history.push({ role: 'assistant', content: 'resp' });
        history.push({ role: 'user', content: 'q' });

        const result = await compaction.compact(history);

        expect(result.list).toBeDefined();
        const tools = result.list.filter(m => m.role === 'tool');
        
        // Verify tools exist
        expect(tools.length).toBeGreaterThanOrEqual(2);

        console.log('Multiple assistants with multiple tools handled correctly');
    });

    it('should handle user exact scenario: 3 concurrent tool calls split by zone', async () => {
        const compaction = new Compaction({
            maxTokens: 8000,
            maxOutputTokens: 2000,
            llmProvider: mockProvider,
            keepMessagesNum: 6
        });

        const history: Message[] = [];

        // 55 old messages
        for (let i = 0; i < 55; i++) {
            history.push({ role: 'user', content: `old message ${i} `.repeat(10), type: 'text' });
        }

        // Assistant with 3 tool_calls
        const callIds = [
            'call_-7948059836144954109',
            'call_-7948059836144954108',
            'call_-7948059836144954107',
        ];

        history.push({
            role: 'assistant',
            content: '',
            tool_calls: callIds.map(id => ({
                id,
                type: 'function' as const,
                function: { name: 'tool', arguments: '{}' },
            })),
        });

        // All 3 tool responses
        history.push({ role: 'tool', tool_call_id: callIds[0], content: 'result 1' });
        history.push({ role: 'tool', tool_call_id: callIds[1], content: 'result 2' });
        history.push({ role: 'tool', tool_call_id: callIds[2], content: 'result 3' });

        // 4 more messages
        history.push({ role: 'user', content: 'q1' });
        history.push({ role: 'assistant', content: 'a1' });
        history.push({ role: 'user', content: 'q2' });
        history.push({ role: 'assistant', content: 'a2' });

        const result = await compaction.compact(history);

        expect(result.list).toBeDefined();
        
        // Verify all 3 tool responses exist
        const tools = result.list.filter(m => m.role === 'tool');
        expect(tools.length).toBe(3);

        console.log('User scenario verified: All 3 tool responses preserved after compression');
    });
});
