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

describe('Compaction - 边缘场景测试', () => {
  const mockProvider = new MockLLMProvider() as any;

  describe('场景1: 多次连续工具调用', () => {
    it('应该处理两个不同的 assistant 消息的 tool 回复', async () => {
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

      // 第一次工具调用（完整的，在 pendingMessages）
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'read', arguments: '{}' } },
          { id: 'call_2', type: 'function', function: { name: 'read', arguments: '{}' } },
        ],
      });
      history.push({ role: 'tool', content: 'result 1', type: 'tool', tool_call_id: 'call_1' });
      history.push({ role: 'tool', content: 'result 2', type: 'tool', tool_call_id: 'call_2' });

      // 第二次工具调用（被切断）
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'call_3', type: 'function', function: { name: 'read', arguments: '{}' } },
          { id: 'call_4', type: 'function', function: { name: 'read', arguments: '{}' } },
        ],
      });
      history.push({ role: 'tool', content: 'result 3', type: 'tool', tool_call_id: 'call_3' });
      history.push({ role: 'tool', content: 'result 4', type: 'tool', tool_call_id: 'call_4' });

      // 再加 4 条消息
      history.push({ role: 'assistant', content: 'response', type: 'text' });
      history.push({ role: 'user', content: 'question', type: 'text' });
      history.push({ role: 'assistant', content: 'response 2', type: 'text' });
      history.push({ role: 'user', content: 'question 2', type: 'text' });

      const result = await compaction.compact(history);

      // 验证：两个 assistant 的 tool_calls 都应该有对应的回复
      const assistants = result.list.filter(m =>
        m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0
      );
      const tools = result.list.filter(m => m.role === 'tool');

      console.log(`Found ${assistants.length} assistants with tool_calls`);
      console.log(`Found ${tools.length} tool replies`);

      // 检查每个 assistant 的 tool_calls 是否都有对应的回复
      for (const assistant of assistants) {
        if (assistant.tool_calls) {
          for (const call of assistant.tool_calls) {
            const hasReply = tools.some(m => m.tool_call_id === call.id);
            expect(hasReply).toBe(true);
          }
        }
      }
    });
  });

  describe('场景2: tool 回复顺序问题', () => {
    it('应该按 tool_calls 的顺序添加 tool 回复', async () => {
      const compaction = new Compaction({
        maxTokens: 8000,
        maxOutputTokens: 2000,
        llmProvider: mockProvider,
      });

      const history: Message[] = [];

      // 120 条旧消息，确保触发压缩
      for (let i = 0; i < 120; i++) {
        history.push({
          role: 'user',
          content: `Message ${i} with lots of content. `.repeat(8),
          type: 'text',
        });
      }

      // assistant 调用 3 个工具（顺序：A, B, C）
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'call_A', type: 'function', function: { name: 'read_A', arguments: '{}' } },
          { id: 'call_B', type: 'function', function: { name: 'read_B', arguments: '{}' } },
          { id: 'call_C', type: 'function', function: { name: 'read_C', arguments: '{}' } },
        ],
      });

      // tool 回复顺序被打乱（C, A, B）
      history.push({ role: 'tool', content: 'result C', type: 'tool', tool_call_id: 'call_C' });
      history.push({ role: 'tool', content: 'result A', type: 'tool', tool_call_id: 'call_A' });
      history.push({ role: 'tool', content: 'result B', type: 'tool', tool_call_id: 'call_B' });

      history.push({ role: 'assistant', content: 'done', type: 'text' });
      history.push({ role: 'user', content: 'next', type: 'text' });

      const result = await compaction.compact(history);

      // 打印压缩后的消息列表以便调试
      console.log('\n=== 压缩后的消息列表 ===');
      result.list.forEach((m, i) => {
        const tcid = m.tool_call_id || (m.tool_calls ? `[assistant with ${m.tool_calls.length} tool_calls]` : m.content.slice(0, 20));
        console.log(`[${i}] role=${m.role}, ${tcid}`);
      });

      // 检查 tool 回复的顺序是否正确
      const assistant = result.list.find(m =>
        m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 3
      );

      if (assistant && assistant.tool_calls) {
        const assistantIndex = result.list.indexOf(assistant);

        // tool 回复应该紧随 assistant 之后，且顺序匹配 tool_calls
        let allCorrect = true;
        for (let i = 0; i < assistant.tool_calls.length; i++) {
          const expectedCallId = assistant.tool_calls[i].id;
          const nextMessage = result.list[assistantIndex + 1 + i];

          if (nextMessage && nextMessage.role === 'tool') {
            const isCorrect = nextMessage.tool_call_id === expectedCallId;
            console.log(`Position ${i}: expected ${expectedCallId}, got ${nextMessage.tool_call_id} - ${isCorrect ? '✓' : '✗'}`);
            if (!isCorrect) allCorrect = false;
          }
        }

        // 断言顺序正确
        expect(allCorrect).toBe(true);
      }
    });
  });

  describe('场景3: 保护区大小膨胀', () => {
    it('应该记录保护区实际大小超过 KEEP_RECENT_COUNT 的情况', async () => {
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

      // 6 个并发工具调用
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'test', arguments: '{}' } },
          { id: 'call_2', type: 'function', function: { name: 'test', arguments: '{}' } },
          { id: 'call_3', type: 'function', function: { name: 'test', arguments: '{}' } },
          { id: 'call_4', type: 'function', function: { name: 'test', arguments: '{}' } },
          { id: 'call_5', type: 'function', function: { name: 'test', arguments: '{}' } },
          { id: 'call_6', type: 'function', function: { name: 'test', arguments: '{}' } },
        ],
      });

      for (let i = 1; i <= 6; i++) {
        history.push({
          role: 'tool',
          content: `result ${i}`,
          type: 'tool',
          tool_call_id: `call_${i}`,
        });
      }

      // 加 2 条消息
      history.push({ role: 'assistant', content: 'done', type: 'text' });
      history.push({ role: 'user', content: 'next', type: 'text' });

      const originalHistoryLength = history.length;
      const result = await compaction.compact(history);

      console.log(`原始历史长度: ${originalHistoryLength}`);
      console.log(`压缩后保留区长度: ${result.list.length}`);
      console.log(`KEEP_RECENT_COUNT = 6，实际保护区可能 = 6 + ${result.list.length - 6}`);

      // 验证消息完整性
      const assistant = result.list.find(m =>
        m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 6
      );
      const tools = result.list.filter(m => m.role === 'tool');

      expect(assistant).toBeDefined();
      expect(tools.length).toBe(6);
      console.log('✓ 6 个并发工具调用被正确保留');
    });
  });

  describe('场景4: tool_call_id 为空或无效', () => {
    it('应该优雅处理无效的 tool_call_id', async () => {
      const compaction = new Compaction({
        maxTokens: 8000,
        maxOutputTokens: 2000,
        llmProvider: mockProvider,
      });

      const history: Message[] = [];

      // 增加消息数量以确保触发压缩
      for (let i = 0; i < 110; i++) {
        history.push({
          role: 'user',
          content: `Long message ${i} with lots of content to trigger compaction. `.repeat(3),
          type: 'text',
        });
      }

      // 包含无效 tool_call_id 的消息
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'valid_call', type: 'function', function: { name: 'test', arguments: '{}' } },
        ],
      });
      history.push({ role: 'tool', content: 'result', type: 'tool', tool_call_id: 'valid_call' });
      history.push({ role: 'tool', content: 'invalid result', type: 'tool', tool_call_id: undefined as any });
      history.push({ role: 'tool', content: 'another result', type: 'tool', tool_call_id: '' as any });

      history.push({ role: 'assistant', content: 'done', type: 'text' });
      history.push({ role: 'user', content: 'next', type: 'text' });

      // 不应该抛出错误
      const result = await compaction.compact(history);

      // 验证压缩成功
      expect(result.isCompacted).toBe(true);

      // 验证有效的 tool_call 被正确处理
      const assistant = result.list.find(m =>
        m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0
      );
      const validTool = result.list.find(m =>
        m.role === 'tool' && m.tool_call_id === 'valid_call'
      );

      expect(assistant).toBeDefined();
      expect(validTool).toBeDefined();

      console.log('✓ 优雅处理了无效的 tool_call_id');
    });
  });

  describe('场景5: 保护区首条不是 tool 消息', () => {
    it('应该正确处理保护区首条是 user/assistant 消息的情况', async () => {
      const compaction = new Compaction({
        maxTokens: 8000,
        maxOutputTokens: 2000,
        llmProvider: mockProvider,
      });

      const history: Message[] = [];

      // 增加消息数量以确保触发压缩
      for (let i = 0; i < 110; i++) {
        history.push({
          role: 'user',
          content: `Long message ${i} with lots of content to trigger compaction. `.repeat(3),
          type: 'text',
        });
      }

      // 最后几条消息：assistant → user → assistant（没有 tool 在最前面）
      history.push({ role: 'assistant', content: 'response 1', type: 'text' });
      history.push({ role: 'user', content: 'question 1', type: 'text' });
      history.push({ role: 'assistant', content: 'response 2', type: 'text' });

      const result = await compaction.compact(history);

      // 验证压缩成功
      expect(result.isCompacted).toBe(true);

      // 验证最后几条消息被保留
      const lastThree = result.list.slice(-3);
      expect(lastThree[0].role).toBe('assistant');
      expect(lastThree[1].role).toBe('user');
      expect(lastThree[2].role).toBe('assistant');

      console.log('✓ 保护区首条不是 tool 消息时正常工作');
    });
  });

  describe('场景6: Assistant 在 pending 区，部分 tool 在 active 区', () => {
    it('应该正确处理 assistant 在 pending 区但部分 tool 回复在 active 区的情况', async () => {
      const compaction = new Compaction({
        maxTokens: 8000,
        maxOutputTokens: 2000,
        llmProvider: mockProvider,
      });

      const history: Message[] = [];

      // 100 条旧消息，确保 assistant 在 pending 区（索引 < 101）
      for (let i = 0; i < 100; i++) {
        history.push({
          role: 'user',
          content: `Message ${i} `.repeat(5),
          type: 'text',
        });
      }

      // assistant 在 pending 区（索引 100）
      history.push({
        role: 'assistant',
        content: '',
        type: 'tool_call',
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
          { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
          { id: 'call_3', type: 'function', function: { name: 'tool3', arguments: '{}' } },
        ],
      });

      // tool 回复：前 2 个在 pending 区，第 3 个在 active 区
      history.push({ role: 'tool', content: 'result 1', type: 'tool', tool_call_id: 'call_1' });
      history.push({ role: 'tool', content: 'result 2', type: 'tool', tool_call_id: 'call_2' });
      history.push({ role: 'tool', content: 'result 3', type: 'tool', tool_call_id: 'call_3' });

      // 再加 4 条消息，确保触发压缩
      history.push({ role: 'assistant', content: 'response', type: 'text' });
      history.push({ role: 'user', content: 'question', type: 'text' });
      history.push({ role: 'assistant', content: 'response 2', type: 'text' });
      history.push({ role: 'user', content: 'question 2', type: 'text' });

      // splitPoint = 107 - 6 = 101
      // pendingMessages: [0-100] (101 messages)
      // activeMessages: [101-106] (6 messages)
      // assistant 在索引 100（pending 区）
      // tool 回复：call_1/call_2 在 pending 区（101, 102），call_3 在 active 区（103）

      const result = await compaction.compact(history);

      // 验证压缩成功
      expect(result.isCompacted).toBe(true);

      // 验证 assistant 被移到 active 区
      const assistant = result.list.find(m =>
        m.role === 'assistant' && m.tool_calls && m.tool_calls.length === 3
      );
      expect(assistant).toBeDefined();

      // 验证所有 3 个 tool 回复都存在
      const tools = result.list.filter(m => m.role === 'tool');
      expect(tools.length).toBe(3);

      // 验证消息顺序正确：assistant → tool1 → tool2 → tool3
      if (assistant && assistant.tool_calls) {
        const assistantIndex = result.list.indexOf(assistant);

        for (let i = 0; i < assistant.tool_calls.length; i++) {
          const expectedCallId = assistant.tool_calls[i].id;
          const nextMessage = result.list[assistantIndex + 1 + i];

          expect(nextMessage).toBeDefined();
          expect(nextMessage.role).toBe('tool');
          expect(nextMessage.tool_call_id).toBe(expectedCallId);
        }
      }

      console.log('✓ Assistant 在 pending 区但部分 tool 在 active 区时正常工作');
    });
  });
});
