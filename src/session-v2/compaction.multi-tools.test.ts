import { describe, it, expect } from 'vitest';
import { Compaction } from './compaction';
import { LLMProvider } from '../providers/base';
import type { Message } from '../providers/base';

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
    // This is the exact bug scenario reported by user
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    // 100 old messages to trigger compression
    for (let i = 0; i < 100; i++) {
      history.push({ role: 'user', content: `msg ${i}`, type: 'text' });
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

    // Tools split: call_1/call_2 in pending zone, call_3/call_4 in active zone
    history.push({ role: 'tool', tool_call_id: 'call_1', content: 'result 1' });
    history.push({ role: 'tool', tool_call_id: 'call_2', content: 'result 2' });
    history.push({ role: 'tool', tool_call_id: 'call_3', content: 'result 3' });
    history.push({ role: 'tool', tool_call_id: 'call_4', content: 'result 4' });

    // 4 more messages to ensure zone split
    history.push({ role: 'user', content: 'q1' });
    history.push({ role: 'assistant', content: 'a1' });
    history.push({ role: 'user', content: 'q2' });
    history.push({ role: 'assistant', content: 'a2' });

    const result = await compaction.compact(history);

    // Verify compression triggered
    expect(result.isCompacted).toBe(true);

    // Verify ALL 4 tools preserved
    const assistant = result.list.find(m => m.tool_calls?.length === 4);
    expect(assistant).toBeDefined();

    const tools = result.list.filter(m => m.role === 'tool');
    expect(tools.length).toBe(4);

    // Verify order: assistant -> tool1 -> tool2 -> tool3 -> tool4
    const assistantIdx = result.list.indexOf(assistant!);
    expect(result.list[assistantIdx + 1].tool_call_id).toBe('call_1');
    expect(result.list[assistantIdx + 2].tool_call_id).toBe('call_2');
    expect(result.list[assistantIdx + 3].tool_call_id).toBe('call_3');
    expect(result.list[assistantIdx + 4].tool_call_id).toBe('call_4');

    console.log('Multi-tool bug fix verified: All 4 tool responses preserved');
  });

  it('should handle multiple assistants each with multiple tool_calls', async () => {
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    for (let i = 0; i < 100; i++) {
      history.push({ role: 'user', content: `msg ${i}`, type: 'text' });
    }

    // Assistant 1: 3 tool_calls (split: 2 in pending, 1 in active)
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

    // Assistant 2: 2 tool_calls (all in active)
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

    // Add enough messages to ensure proper zone split
    // Total: 100 + 1 + 3 + 1 + 2 + 3 = 110 messages
    // splitPoint = 110 - 6 = 104
    // Assistant 1 tools at indices 101, 102, 103 -> all in pending
    // Assistant 2 at index 104 (in active, at splitPoint)
    // Assistant 2 tools at indices 105, 106 -> in active
    // We need 3 more messages to get to 110
    history.push({ role: 'user', content: 'next' });
    history.push({ role: 'assistant', content: 'resp' });
    history.push({ role: 'user', content: 'q' });

    const result = await compaction.compact(history);

    // Only assistant 2 should be preserved (all in active zone)
    // Assistant 1's tools are all in pending, so it gets summarized
    const assistants = result.list.filter(m => m.tool_calls && m.tool_calls.length > 0);
    expect(assistants.length).toBe(1);
    expect(assistants[0].tool_calls?.length).toBe(2);

    // Verify assistant 2's 2 tools are preserved
    const tools = result.list.filter(m => m.role === 'tool');
    expect(tools.length).toBe(2);

    console.log('Multiple assistants with multiple tools handled correctly');
  });

  it('should handle user exact scenario: 3 concurrent tool calls split by zone', async () => {
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    // 100 old messages
    for (let i = 0; i < 100; i++) {
      history.push({ role: 'user', content: `old message ${i}`, type: 'text' });
    }

    // Assistant with 3 tool_calls matching user's example
    const callIds = [
      'call_-7948059836144954109',
      'call_-7948059836144954108',
      'call_-7948059836144954107'
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

    // 4 more messages to create zone split
    history.push({ role: 'user', content: 'q1' });
    history.push({ role: 'assistant', content: 'a1' });
    history.push({ role: 'user', content: 'q2' });
    history.push({ role: 'assistant', content: 'a2' });

    const result = await compaction.compact(history);

    // Verify compression triggered
    expect(result.isCompacted).toBe(true);

    // Verify assistant exists with all 3 tool_calls
    const assistant = result.list.find(m => m.tool_calls?.length === 3);
    expect(assistant).toBeDefined();

    // Verify ALL 3 tool responses exist (bug fix: not just 1)
    const tools = result.list.filter(m => m.role === 'tool');
    expect(tools.length).toBe(3);

    // Verify each tool_call has matching reply
    for (const callId of callIds) {
      const hasReply = tools.some(m => m.tool_call_id === callId);
      expect(hasReply).toBe(true);
    }

    console.log('User scenario verified: All 3 tool responses preserved after compression');
  });
});
