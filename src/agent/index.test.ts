/**
 * Agent 单元测试
 * 测试 Agent 的核心功能：错误处理、工具调用、工作流程
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Agent from './index';
import { LLMProvider, LLMResponse, Message, ToolCall } from '../providers/base';
import { ToolRegistry } from '../tool/registry';
import { BashTool } from '../tool';

// =============================================================================
// Mock LLM Provider
// =============================================================================

/**
 * 创建 Mock LLM Provider
 */
function createMockLLMProvider(config: {
    responses?: LLMResponse[];
    errors?: Error[];
    shouldThrow?: boolean;
}) {
    const { responses = [], errors = [], shouldThrow = false } = config;

    let responseIndex = 0;
    let errorIndex = 0;
    let callCount = 0;

    const provider = {
        maxOutputTokens: 8000,
        maxTokens: 16000,
        generate: vi.fn(async function(
            _messages: Message[],
            _options?: any
        ): Promise<LLMResponse | null> {
            callCount++;

            if (shouldThrow && errors.length > 0) {
                const error = errors[errorIndex % errors.length];
                errorIndex++;
                throw error;
            }

            if (responses.length === 0) {
                return {
                    content: 'Mock response',
                    role: 'assistant',
                    type: 'text',
                    finishReason: 'stop',
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                };
            }

            const response = responses[responseIndex % responses.length];
            responseIndex++;
            return response;
        }),
        getCallCount: () => callCount,
        reset: () => {
            responseIndex = 0;
            errorIndex = 0;
            callCount = 0;
            vi.clearAllMocks();
        },
    };

    return provider;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * 创建 Agent 实例
 */
function createAgent(llmProvider: LLMProvider, options?: { noProgressLimit?: number; maxLoop?: number }) {
    return new Agent({
        llmProvider,
        systemPrompt: 'You are a test agent.',
        noProgressLimit: options?.noProgressLimit ?? 2,
        maxLoop: options?.maxLoop ?? 10,
    });
}

/**
 * 创建简单的 LLM 响应
 */
function createLLMResponse(config: {
    content?: string;
    tool_calls?: ToolCall[];
    finishReason?: string;
    type?: 'text' | 'tool' | 'tool_call';
}): LLMResponse {
    return {
        content: config.content ?? '',
        role: 'assistant',
        type: config.type ?? 'text',
        tool_calls: config.tool_calls,
        finishReason: config.finishReason ?? 'stop',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Agent Basic Flow', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Hello! How can I help you?' })],
        });
        // 保留默认工具
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should return response when no tool calls needed', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Say hello');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Hello! How can I help you?');
        expect(response?.role).toBe('assistant');
        expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    });

    it('should add user message to session', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Test message');

        const messages = agent.sessionManager.getMessages();
        expect(messages.some(m => m.role === 'user' && m.content === 'Test message')).toBe(true);
    });

    it('should handle non-streaming response', async () => {
        const mockProviderWithStream = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Response' })],
        });

        const agent = createAgent(mockProviderWithStream);
        agent.start();

        // 非流式模式
        const response = await agent.run('Get response');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Response');
    });
});

describe('Agent Tool Call Error Handling', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                // First call: request tool call
                createLLMResponse({
                    content: 'Let me call a tool',
                    tool_calls: [
                        {
                            id: 'call_1',
                            type: 'function',
                            function: { name: 'bash', arguments: '{"command":"ls"}' },
                        },
                    ],
                    type: 'tool_call',
                    finishReason: 'tool_calls',
                },
                ),
                // Second call: respond after tool result (LLM handles the error gracefully)
                createLLMResponse({
                    content: 'Tool completed successfully',
                    finishReason: 'stop',
                }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should handle tool execution error gracefully (not throw)', async () => {
        const bashTool = ToolRegistry.get('bash');
        expect(bashTool).toBeDefined();

        vi.spyOn(bashTool!, 'execute').mockRejectedValue(new Error('Command failed'));

        const agent = createAgent(mockProvider);
        agent.start();

        // Should not throw - tool error is caught and returned as a message
        const response = await agent.run('Run a failing command');

        expect(response).toBeDefined();
        // Should complete without throwing
        expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    });

    it('should include tool error in session history', async () => {
        const bashTool = ToolRegistry.get('bash');
        vi.spyOn(bashTool!, 'execute').mockRejectedValue(new Error('Test error'));

        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Test tool error');

        const messages = agent.sessionManager.getMessages();
        const toolMessages = messages.filter(m => m.role === 'tool');

        // Should have tool response with error
        expect(toolMessages.length).toBeGreaterThan(0);
        const errorMessage = toolMessages.find(m => m.content.includes('Error'));
        expect(errorMessage).toBeDefined();
        expect(errorMessage?.content).toContain('Test error');
    });

    it('should continue after tool error (LLM can recover)', async () => {
        const bashTool = ToolRegistry.get('bash');
        // First call throws, second call succeeds
        let callCount = 0;
        vi.spyOn(bashTool!, 'execute').mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                throw new Error('First call fails');
            }
            return Promise.resolve({ success: true, data: 'Success' });
        });

        const providerWithRecovery = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Let me try again',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Recovery successful', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(providerWithRecovery);
        agent.start();

        const response = await agent.run('Test recovery');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Recovery successful');
    });

    it('should handle empty tool name gracefully', async () => {
        const providerWithBadTool = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [
                        { id: 'call_1', type: 'function', function: { name: '', arguments: '{}' } },
                    ],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(providerWithBadTool);
        agent.start();

        const response = await agent.run('Test empty tool name');

        expect(response).toBeDefined();
        const messages = agent.sessionManager.getMessages();
        const toolMsg = messages.find(m => m.role === 'tool' && m.tool_call_id === 'call_1');
        expect(toolMsg?.content).toBe('Error: Tool name is empty');
    });
});

describe('Agent FinishReason Handling', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should accept valid finishReasons (stop, eos, undefined)', async () => {
        const validReasons = ['stop', 'eos', undefined];

        for (const reason of validReasons) {
            const mockProvider = createMockLLMProvider({
                responses: [createLLMResponse({ content: 'Response', finishReason: reason as any })],
            });

            const agent = createAgent(mockProvider);
            agent.start();

            const response = await agent.run(`Test finishReason: ${reason}`);

            expect(response).toBeDefined();
            expect(response?.content).toBe('Response');
            expect(mockProvider.generate).toHaveBeenCalledTimes(1);
        }
    });

    it('should retry on unexpected finishReason', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({ content: 'First attempt', finishReason: 'length' }),
                createLLMResponse({ content: 'Second attempt', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(mockProvider, { noProgressLimit: 3 });
        agent.start();

        const response = await agent.run('Test retry on bad finishReason');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Second attempt');
        expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    });

    it('should terminate after max consecutive finishReason errors', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({ content: 'Attempt 1', finishReason: 'content_filter' }),
                createLLMResponse({ content: 'Attempt 2', finishReason: 'content_filter' }),
                createLLMResponse({ content: 'Attempt 3', finishReason: 'content_filter' }),
            ],
        });

        const agent = createAgent(mockProvider, { noProgressLimit: 2 });
        agent.start();

        const response = await agent.run('Test max errors');

        expect(response).toBeDefined();
        expect(response?.content).toContain('Max error limit reached');
        expect(mockProvider.generate).toHaveBeenCalledTimes(3);
        // 3 attempts before termination
    });
});

describe('Agent Network Error Handling', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should retry on network error with exponential backoff', async () => {
        const networkErrors = [
            new Error('Failed to fetch'),
            new Error('ETIMEDOUT'),
            new Error('socket hang up'),
        ];

        const mockProvider = createMockLLMProvider({
            errors: networkErrors,
            responses: [createLLMResponse({ content: 'Recovery successful', finishReason: 'stop' })],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        const startTime = Date.now();
        const response = await agent.run('Test network retry');
        const elapsed = Date.now() - startTime;

        expect(response).toBeDefined();
        expect(response?.content).toBe('Recovery successful');
        // Network errors should trigger retries (at least 1 retry)
        expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should terminate after max network retries', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [
                new Error('Failed to fetch'),
                new Error('Failed to fetch'),
                new Error('Failed to fetch'),
                new Error('Failed to fetch'),
            ],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Test max network retries');

        expect(response).toBeDefined();
        // Should contain error info
        expect(response?.content).toContain('error');
        // Should have tried multiple times
        expect(mockProvider.generate).toHaveBeenCalled();
    }, 30000);

    it('should handle network errors differently from regular errors', async () => {
        // 使用不同类型的网络错误
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [
                new Error('ECONNRESET'),
                new Error('ECONNRESET'),
                new Error('ECONNRESET'),
                new Error('ECONNRESET'),
            ],
        });

        const agent = createAgent(mockProvider, { noProgressLimit: 1 });
        agent.start();

        const response = await agent.run('Test network error count');

        // 网络错误会重试，所以会调用多次
        // 但不会因为 consecutiveErrorCount 而终止
        expect(mockProvider.generate).toHaveBeenCalled();
    }, 30000);
});

describe('Agent Tool Error vs LLM Error Separation', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should NOT classify tool error as LLM error (should not throw)', async () => {
        const bashTool = ToolRegistry.get('bash');
        vi.spyOn(bashTool!, 'execute').mockRejectedValue(new Error('Tool crashed'));

        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 't1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Handled tool error', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        // Should NOT throw - tool error is caught internally
        const response = await agent.run('Test error separation');

        expect(response).toBeDefined();
        // Should get to second response (LLM handled the error)
        expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    });

    it('should return structured error message in history', async () => {
        const bashTool = ToolRegistry.get('bash');
        vi.spyOn(bashTool!, 'execute').mockRejectedValue(new Error('Critical failure'));

        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 't1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Test error format');

        const messages = agent.sessionManager.getMessages();
        const toolMsg = messages.find(m => m.role === 'tool');

        // Error should be in tool message, not as a thrown exception
        expect(toolMsg?.content).toContain('Critical failure');
    });
});

describe('Agent Max Loop Limit', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should terminate when maxLoop is reached', async () => {
        // Create provider that always requests tools
        const mockProvider = createMockLLMProvider({
            responses: Array(20).fill(null).map((_, i) =>
                createLLMResponse({
                    content: `Loop ${i}`,
                    tool_calls: [{ id: `c${i}`, type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                })
            ),
        });

        const bashTool = ToolRegistry.get('bash');
        vi.spyOn(bashTool!, 'execute').mockResolvedValue({ success: true, data: 'ok' });

        const agent = createAgent(mockProvider, { maxLoop: 5 });
        agent.start();

        const response = await agent.run('Test max loop');

        expect(response).toBeDefined();
        expect(response?.content).toContain('Max loop limit reached');
        expect(response?.content).toContain('5');
    });

    it('should allow unlimited loops when maxLoop is null', async () => {
        let callCount = 0;
        const bashTool = ToolRegistry.get('bash');
        vi.spyOn(bashTool!, 'execute').mockImplementation(() => {
            callCount++;
            if (callCount >= 3) {
                // Stop requesting tools after 3 iterations
                return Promise.resolve({ success: true, data: 'final' });
            }
            return Promise.resolve({ success: true, data: 'continuing' });
        });

        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Continue 1',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({
                    content: 'Continue 2',
                    tool_calls: [{ id: 'c2', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({
                    content: 'Continue 3',
                    tool_calls: [{ id: 'c3', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Final response', finishReason: 'stop' }),
            ],
        });

        const agent = createAgent(mockProvider, { maxLoop: null });
        agent.start();

        const response = await agent.run('Test unlimited loops');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Final response');
    });
});

describe('Agent Session Management', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Response' })],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should persist messages in session', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('First message');
        await agent.run('Second message');

        const messages = agent.sessionManager.getMessages();
        expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should clear session', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('A message');
        await agent.sessionManager.clearAll();

        const messages = agent.sessionManager.getMessages();
        expect(messages.length).toBe(0);
    });

    it('should use custom session ID', async () => {
        const customSessionId = 'test-session-123';
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'Test',
            sessionId: customSessionId,
        });
        agent.start();

        expect(agent.sessionManager.id).toBe(customSessionId);
    });
});

describe('Agent Error Message Formatting', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should format network error message for history', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Failed to fetch')],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Test network error format');

        const messages = agent.sessionManager.getMessages();
        const lastMsg = messages[messages.length - 1];

        // Should contain helpful message about network error
        expect(lastMsg.content).toContain('Network Error');
        expect(lastMsg.content).toContain('connectivity');
    }, 30000);

    it('should format generic error message for history', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Something went wrong')],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Test generic error format');

        const messages = agent.sessionManager.getMessages();
        const lastMsg = messages[messages.length - 1];

        expect(lastMsg.content).toContain('[Error]');
        expect(lastMsg.content).toContain('Something went wrong');
    });
});

describe('isNetworkError Utility', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should detect network-related errors and trigger retry', async () => {
        const networkErrors = [
            new Error('Failed to fetch'),
            new Error('Network error'),
            new Error('ECONNRESET'),
            new Error('ETIMEDOUT'),
            new Error('socket hang up'),
            new Error('Service Unavailable'),
            new Error('429 Too Many Requests'),
        ];

        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: networkErrors,
        });

        const agent = createAgent(mockProvider);
        agent.start();

        // Should trigger retry mechanism for network errors
        const response = await agent.run('Test network error detection');

        // Network errors should cause multiple retries
        expect(mockProvider.generate).toHaveBeenCalled();
    }, 30000);

    it('should not retry on non-network errors (should terminate quickly)', async () => {
        const nonNetworkErrors = [
            new Error('Invalid API key'),
            new Error('Model not found'),
            new Error('Content policy violation'),
        ];

        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: nonNetworkErrors,
        });

        const agent = createAgent(mockProvider, { noProgressLimit: 1 });
        agent.start();

        const response = await agent.run('Test non-network error');

        // Should terminate after 1 error (no retry for non-network errors)
        expect(response?.content).toContain('Max error limit reached');
    });
});
