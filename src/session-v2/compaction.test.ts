import { describe, it, expect } from 'vitest';
import { Compaction } from './compaction';
import type { Message, LLMProvider } from '../providers/base';

// Mock LLM Provider
class MockLLMProvider implements LLMProvider {
  async generate(_messages: Message[], _options?: any) {
    return {
      content: 'Summary: conversation about testing',
      role: 'assistant',
      usage: { prompt_tokens: 1000, completion_tokens: 100, total_tokens: 1100 },
    };
  }
  config = {};
}

describe('Compaction - 并发工具调用修复验证', () => {
  const mockProvider = new MockLLMProvider() as any;

  it('场景1: 4个并发工具调用被保护区边界切断', async () => {
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    // 125 条旧消息（增加以确保触发压缩）
    for (let i = 0; i < 125; i++) {
      history.push({
        role: 'user',
        content: `Long message ${i} with lots of content. `.repeat(4),
        type: 'text',
      });
    }

    // assistant 调用 4 个工具
    const assistantMsg: Message = {
      role: 'assistant',
      content: '',
      type: 'tool_call',
      tool_calls: [
        { id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"types.ts"}' } },
        { id: 'call_2', type: 'function', function: { name: 'read_file', arguments: '{"path":"base.ts"}' } },
        { id: 'call_3', type: 'function', function: { name: 'read_file', arguments: '{"path":"docker.ts"}' } },
        { id: 'call_4', type: 'function', function: { name: 'read_file', arguments: '{"path":"index.ts"}' } },
      ],
    };
    history.push(assistantMsg);

    // 4 个 tool 回复
    history.push({ role: 'tool', content: 'types.ts content...', type: 'tool', tool_call_id: 'call_1' });
    history.push({ role: 'tool', content: 'base.ts content...', type: 'tool', tool_call_id: 'call_2' });
    history.push({ role: 'tool', content: 'docker.ts content...', type: 'tool', tool_call_id: 'call_3' });
    history.push({ role: 'tool', content: 'index.ts content...', type: 'tool', tool_call_id: 'call_4' });

    // 再加 4 条消息
    history.push({ role: 'assistant', content: 'response 1', type: 'text' });
    history.push({ role: 'user', content: 'question 1', type: 'text' });
    history.push({ role: 'assistant', content: 'response 2', type: 'text' });
    history.push({ role: 'user', content: 'question 2', type: 'text' });

    const result = await compaction.compact(history);

    // 验证压缩被触发
    expect(result.isCompacted).toBe(true);

    // 验证 assistant 存在
    const assistantInActive = result.list.find(m =>
      m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 4
    );
    expect(assistantInActive).toBeDefined();

    // 验证所有 4 个 tool 回复都存在
    const toolReplies = result.list.filter(m => m.role === 'tool');
    expect(toolReplies.length).toBe(4);

    // 验证每个 tool_call 都有对应的回复
    const toolCallIds = assistantInActive!.tool_calls!.map(c => c.id);
    for (const callId of toolCallIds) {
      const hasMatchingReply = toolReplies.some(m => m.tool_call_id === callId);
      expect(hasMatchingReply).toBe(true);
    }

    console.log('✓ 场景1 通过：4个并发工具调用被正确保留');
  });

  it('场景2: 3个并发工具调用，只有2个在保护区内', async () => {
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    // 100 条旧消息
    for (let i = 0; i < 100; i++) {
      history.push({
        role: 'user',
        content: `Message ${i} `.repeat(5),
        type: 'text',
      });
    }

    // assistant 调用 3 个工具
    history.push({
      role: 'assistant',
      content: '',
      type: 'tool_call',
      tool_calls: [
        { id: 'tool_a', type: 'function', function: { name: 'test', arguments: '{}' } },
        { id: 'tool_b', type: 'function', function: { name: 'test', arguments: '{}' } },
        { id: 'tool_c', type: 'function', function: { name: 'test', arguments: '{}' } },
      ],
    });

    // 3 个 tool 回复
    history.push({ role: 'tool', content: 'result A', type: 'tool', tool_call_id: 'tool_a' });
    history.push({ role: 'tool', content: 'result B', type: 'tool', tool_call_id: 'tool_b' });
    history.push({ role: 'tool', content: 'result C', type: 'tool', tool_call_id: 'tool_c' });

    // 再加 5 条消息
    for (let i = 0; i < 5; i++) {
      history.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `msg ${i}`, type: 'text' });
    }

    const result = await compaction.compact(history);

    // 验证 assistant 存在
    const assistant = result.list.find(m =>
      m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 3
    );
    expect(assistant).toBeDefined();

    // 验证所有 3 个 tool 回复都存在
    const tools = result.list.filter(m => m.role === 'tool');
    expect(tools.length).toBe(3);

    console.log('✓ 场景2 通过：3个并发工具调用被正确保留');
  });

  it('场景3: 单个工具调用不应该影响压缩', async () => {
    const compaction = new Compaction({
      maxTokens: 8000,
      maxOutputTokens: 2000,
      llmProvider: mockProvider,
    });

    const history: Message[] = [];

    for (let i = 0; i < 100; i++) {
      history.push({
        role: 'user',
        content: `Message ${i} `.repeat(5),
        type: 'text',
      });
    }

    // 单个工具调用
    history.push({
      role: 'assistant',
      content: '',
      type: 'tool_call',
      tool_calls: [
        { id: 'single_tool', type: 'function', function: { name: 'test', arguments: '{}' } },
      ],
    });
    history.push({ role: 'tool', content: 'result', type: 'tool', tool_call_id: 'single_tool' });

    const result = await compaction.compact(history);

    // 验证 assistant 和 tool 回复都被保留
    const assistant = result.list.find(m =>
      m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 1
    );
    const tool = result.list.find(m =>
      m.role === 'tool' && m.tool_call_id === 'single_tool'
    );

    expect(assistant).toBeDefined();
    expect(tool).toBeDefined();

    console.log('✓ 场景3 通过：单个工具调用被正确保留');
  });
});
