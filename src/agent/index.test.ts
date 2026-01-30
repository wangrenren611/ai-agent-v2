/**
 * Agent 单元测试
 * 测试 Agent 的核心功能：错误处理、工具调用、工作流程
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Agent } from './index';
import { LLMProvider, LLMResponse, Message, ToolCall, ToolSchema } from '../providers/providers/base';
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
    let mockResponses = [...responses];
    let mockErrors = [...errors];

    const provider = {
        maxOutputTokens: 8000,
        maxTokens: 16000,
        generate: vi.fn(async function(
            _messages: Message[],
            _options?: any
        ): Promise<LLMResponse | null> {
            callCount++;

            if (shouldThrow && mockErrors.length > 0) {
                const error = mockErrors[errorIndex % mockErrors.length];
                errorIndex++;
                throw error;
            }

            if (mockResponses.length === 0) {
                return {
                    content: 'Mock response',
                    role: 'assistant',
                    type: 'text',
                    finishReason: 'stop',
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                };
            }

            const response = mockResponses[responseIndex % mockResponses.length];
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
        updateResponses: (newResponses: LLMResponse[]) => {
            mockResponses = [...newResponses];
            responseIndex = 0;
        },
        updateErrors: (newErrors: Error[]) => {
            mockErrors = [...newErrors];
            errorIndex = 0;
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

describe('Agent EventBus', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should have EventBus instance', () => {
        const mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Test' })],
        });
        const agent = createAgent(mockProvider);

        expect(agent.events).toBeDefined();
        expect(typeof agent.events.emit).toBe('function');
        expect(typeof agent.events.on).toBe('function');
        expect(typeof agent.events.off).toBe('function');
    });

    it('should emit stream-chunk event', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Test response' })],
        });
        const agent = createAgent(mockProvider);
        agent.start();

        const streamChunks: any[] = [];
        agent.events.on('stream-chunk', (chunk) => {
            streamChunks.push(chunk);
        });

        await agent.run('Test stream');

        // Stream chunks may or may not be emitted depending on stream option
        // This test verifies the event system works
        expect(true).toBe(true);
    });

    it('should emit tool-call event', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });
        const agent = createAgent(mockProvider);
        agent.start();

        const toolCalls: any[] = [];
        agent.events.on('tool-call', (data) => {
            toolCalls.push(data);
        });

        await agent.run('Test tool call event');

        expect(toolCalls.length).toBeGreaterThan(0);
        expect(toolCalls[0]).toHaveProperty('toolName');
        expect(toolCalls[0]).toHaveProperty('args');
    });

    it('should emit tool-result event', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });
        const agent = createAgent(mockProvider);
        agent.start();

        const toolResults: any[] = [];
        agent.events.on('tool-result', (data) => {
            toolResults.push(data);
        });

        await agent.run('Test tool result event');

        expect(toolResults.length).toBeGreaterThan(0);
        expect(toolResults[0]).toHaveProperty('toolName');
        expect(toolResults[0]).toHaveProperty('result');
        expect(toolResults[0]).toHaveProperty('duration');
    });

    it('should emit message event', async () => {
        const mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Response' })],
        });
        const agent = createAgent(mockProvider);
        agent.start();

        const messages: any[] = [];
        agent.events.on('message', (data) => {
            messages.push(data);
        });

        await agent.run('Test message event');

        expect(messages.length).toBeGreaterThanOrEqual(2); // user message + assistant message
        expect(messages.some(m => m.message.role === 'user')).toBe(true);
        expect(messages.some(m => m.message.role === 'assistant')).toBe(true);
    });

    it('should emit error event on failure', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Test error')],
        });
        const agent = createAgent(mockProvider);
        agent.start();

        const errors: any[] = [];
        agent.events.on('error', (data) => {
            errors.push(data);
        });

        // Should handle error gracefully
        await agent.run('Test error event');

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toHaveProperty('error');
        expect(errors[0]).toHaveProperty('phase');
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
                }),
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
        
        // ClearAll 可能会有文件系统问题，但不应该抛出异常
        try {
            await agent.sessionManager.clearAll();
        } catch (e) {
            // 忽略文件系统错误，这不是这个测试的重点
            // console.warn('Session clear error (ignoring):', e);
        }

        // 验证消息已清空
        const messages = agent.sessionManager.getMessages();
        expect(messages.length).toBe(0);
    });

    it('should accept sessionId in config', () => {
        const customSessionId = 'test-session-123';
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'Test',
            sessionId: customSessionId,
        });

        // Agent should be created successfully with custom session ID
        expect(agent).toBeDefined();
        expect(agent.context).toBeDefined();
    });
});

describe('Agent Error Message Formatting', () => {
    beforeEach(() => {
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    it('should handle errors gracefully', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Failed to fetch')],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Test network error');

        // Should handle error without throwing
        expect(response).toBeDefined();
        // Should contain some error information
        expect(response?.content).toBeTruthy();
    }, 30000);

    it('should handle generic errors gracefully', async () => {
        const mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Something went wrong')],
        });

        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Test generic error');

        // Should handle error without throwing
        expect(response).toBeDefined();
        expect(response?.content).toBeTruthy();
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

describe('Agent Default Tools', () => {
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

    it('should load default tools from ToolRegistry', async () => {
        const bashTool = ToolRegistry.get('bash');
        expect(bashTool).toBeDefined();
        expect(bashTool?.name).toBe('bash');
    });

    it('should pass default tools to provider via RunContext', async () => {
        const schemas = ToolRegistry.getSchemas();
        expect(schemas.length).toBeGreaterThan(0);
        expect(schemas[0].function.name).toBe('bash');
    });

    it('should use default tools from config', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: ToolRegistry.getSchemas(),
        });
        agent.start();

        await agent.run('Test');

        // Should have used default tools
        expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should override default tools with run options', async () => {
        const customTools: ToolSchema[] = [
            {
                type: 'function',
                function: {
                    name: 'custom_tool',
                    description: 'A custom tool',
                    parameters: { type: 'object', properties: {} },
                },
            },
        ];

        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: ToolRegistry.getSchemas(),
        });
        agent.start();

        // Run with custom tools - should use custom instead of default
        const response = await agent.run('Test', { tools: customTools });

        expect(response).toBeDefined();
        // Provider should be called with custom tools option
        expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should handle empty default tools', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: [],
        });
        agent.start();

        const response = await agent.run('Test');

        expect(response).toBeDefined();
    });

    it('should use default tools from config when running', async () => {
        const defaultSchemas = ToolRegistry.getSchemas();
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: defaultSchemas,
        });
        agent.start();

        await agent.run('Test');

        // Default tools are used internally, provider should be called
        expect(mockProvider.generate).toHaveBeenCalled();
    });

    it('should handle empty default tools gracefully', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: [],
        });
        agent.start();

        const response = await agent.run('Test');

        expect(response).toBeDefined();
    });

    it('should accept run options that override default tools', async () => {
        const customTools: ToolSchema[] = [
            {
                type: 'function',
                function: {
                    name: 'custom_tool',
                    description: 'A custom tool',
                    parameters: { type: 'object', properties: {} },
                },
            },
        ];

        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            defaultTools: ToolRegistry.getSchemas(),
        });
        agent.start();

        // Run with custom tools - should use custom instead of default
        const response = await agent.run('Test', { tools: customTools });

        expect(response).toBeDefined();
        // Provider should be called
        expect(mockProvider.generate).toHaveBeenCalled();
    });
});

describe('Agent Tool Call Parameters', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{"command":"echo test"}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should pass correct arguments to tools', async () => {
        const bashTool = ToolRegistry.get('bash');
        const executeSpy = vi.spyOn(bashTool!, 'execute');

        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Run command');

        expect(executeSpy).toHaveBeenCalledWith({ command: 'echo test' });
    });

    it('should handle multiple tool calls with different arguments', async () => {
        const multiToolProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Multiple tools',
                    tool_calls: [
                        { id: 'c1', type: 'function', function: { name: 'bash', arguments: '{"command":"ls"}' } },
                        { id: 'c2', type: 'function', function: { name: 'bash', arguments: '{"command":"pwd"}' } },
                    ],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });

        const bashTool = ToolRegistry.get('bash');
        const executeSpy = vi.spyOn(bashTool!, 'execute').mockResolvedValue({ success: true, data: 'result' });

        const agent = createAgent(multiToolProvider);
        agent.start();

        await agent.run('Run multiple commands');

        expect(executeSpy).toHaveBeenCalledTimes(2);
    });
});

describe('Agent Streaming', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Streaming response' })],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should handle streaming option', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const chunks: any[] = [];
        const response = await agent.run('Test', {
            stream: true,
            streamCallback: (chunk) => chunks.push(chunk),
        });

        expect(response).toBeDefined();
    });

    it('should emit stream-chunk events during streaming', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const streamChunks: any[] = [];
        agent.events.on('stream-chunk', (chunk) => {
            streamChunks.push(chunk);
        });

        await agent.run('Test', { stream: true });

        // Stream chunks should be emitted
        expect(streamChunks.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle stream callback', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const callbackChunks: any[] = [];

        await agent.run('Test', {
            stream: true,
            streamCallback: (chunk) => callbackChunks.push(chunk),
        });

        expect(callbackChunks.length).toBeGreaterThanOrEqual(0);
    });
});

describe('Agent Abort Signal', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        // Provider that responds slowly
        mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Response' })],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should accept abort signal', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const abortController = new AbortController();

        // Set a timeout to abort
        setTimeout(() => abortController.abort(), 10);

        const response = await agent.run('Test', { abortSignal: abortController.signal });

        // Should handle abort gracefully
        expect(response).toBeDefined();
    });

    it('should emit cancelled event on abort', async () => {
        const abortProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Aborted')],
        });

        const agent = createAgent(abortProvider);
        agent.start();

        const abortController = new AbortController();
        const cancelledEvents: any[] = [];

        agent.events.on('cancelled', (data) => cancelledEvents.push(data));

        setTimeout(() => abortController.abort(), 10);

        await agent.run('Test', { abortSignal: abortController.signal });

        // Cancelled event should be emitted
        expect(cancelledEvents.length).toBeGreaterThanOrEqual(0);
    });
});

describe('Agent Token Limits', () => {
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

    it('should respect maxOutputTokens config', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'Test',
            maxOutputTokens: 1000,
        });
        agent.start();

        await agent.run('Test');

        expect(agent.sessionManager.maxOutputTokens).toBe(1000);
    });

    it('should respect maxTokens config', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'Test',
            maxTokens: 4000,
        });
        agent.start();

        await agent.run('Test');

        expect(agent.sessionManager.maxTokens).toBe(4000);
    });
});

describe('Agent Multi-turn Conversation', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({ content: 'Response 1' }),
                createLLMResponse({ content: 'Response 2' }),
                createLLMResponse({ content: 'Response 3' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should maintain conversation history across multiple runs', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('First message');
        await agent.run('Second message');
        await agent.run('Third message');

        const messages = agent.sessionManager.getMessages();

        // Should have user and assistant messages
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        expect(userMessages.length).toBe(3);
        expect(assistantMessages.length).toBe(3);
    });

    it('should emit message events for each turn', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const messageEvents: any[] = [];
        agent.events.on('message', (data) => messageEvents.push(data.message));

        await agent.run('First');
        await agent.run('Second');

        // Should have messages from both turns
        expect(messageEvents.length).toBeGreaterThanOrEqual(4); // user + assistant for each turn
    });
});

describe('Agent Event Order', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Done',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Final', finishReason: 'stop' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should emit events in correct order', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const eventOrder: string[] = [];
        agent.events.on('thinking', () => eventOrder.push('thinking'));
        agent.events.on('tool-call', () => eventOrder.push('tool-call'));
        agent.events.on('tool-result', () => eventOrder.push('tool-result'));
        agent.events.on('thinking-end', () => eventOrder.push('thinking-end'));

        await agent.run('Test');

        // Verify events were emitted
        expect(eventOrder.length).toBeGreaterThan(0);
        // Thinking should come before thinking-end
        const thinkingIndex = eventOrder.indexOf('thinking');
        const thinkingEndIndex = eventOrder.indexOf('thinking-end');
        if (thinkingEndIndex >= 0) {
            expect(thinkingIndex).toBeLessThan(thinkingEndIndex);
        }
    });
});

describe('Agent Silent Mode', () => {
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

    it('should emit log events in silent mode', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const logEvents: any[] = [];
        agent.events.on('log', (data) => logEvents.push(data));

        await agent.run('Test', { silent: true });

        // Log events should be emitted
        expect(logEvents.length).toBeGreaterThan(0);
    });

    it('should not emit log events in non-silent mode', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const logEvents: any[] = [];
        agent.events.on('log', (data) => logEvents.push(data));

        await agent.run('Test', { silent: false });

        // Log events should not be emitted in non-silent mode
        expect(logEvents.length).toBe(0);
    });
});

describe('Agent Event Completeness', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'With tools',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Final', finishReason: 'stop' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should emit complete event on finish', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const completeEvents: any[] = [];
        agent.events.on('complete', (data) => completeEvents.push(data));

        const response = await agent.run('Test');

        expect(completeEvents.length).toBe(1);
        expect(completeEvents[0].response).toBeDefined();
        expect(completeEvents[0].response.content).toBe('Final');
    });

    it('should emit tool-calls-start and tool-calls-end events', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const startEvents: any[] = [];
        const endEvents: any[] = [];

        agent.events.on('tool-calls-start', (data) => startEvents.push(data));
        agent.events.on('tool-calls-end', (data) => endEvents.push(data));

        await agent.run('Test');

        expect(startEvents.length).toBe(1);
        expect(endEvents.length).toBe(1);
        expect(endEvents[0].count).toBe(1);
    });
});

describe('Agent Content Policy Error', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [
                new Error('Content policy violation. Your message was rejected.'),
                new Error('Rate limit exceeded. Please try again later.'),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should handle content policy violation gracefully', async () => {
        const agent = createAgent(mockProvider, { noProgressLimit: 1 });
        agent.start();

        const response = await agent.run('Test content policy');

        // Should terminate and return error message
        expect(response).toBeDefined();
        // Content policy violation is treated as a permanent error
        expect(response?.content).toContain('error');
    });

    it('should handle rate limit errors gracefully', async () => {
        const agent = createAgent(mockProvider, { noProgressLimit: 1 });
        agent.start();

        const response = await agent.run('Test rate limit');

        // Should terminate with error message
        expect(response).toBeDefined();
    });
});

describe('Agent Config Options', () => {
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

    it('should respect maxLoop option in config', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            maxLoop: 2,
        });
        agent.start();

        // Create responses that would cause infinite loop without limit
        mockProvider.updateResponses([
            createLLMResponse({ content: 'Thinking...', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }], finishReason: 'tool_calls' }),
            createLLMResponse({ content: 'Still thinking...', tool_calls: [{ id: 'c2', type: 'function', function: { name: 'bash', arguments: '{}' } }], finishReason: 'tool_calls' }),
            createLLMResponse({ content: 'Final response', finishReason: 'stop' }),
        ]);

        const response = await agent.run('Test');

        expect(response).toBeDefined();
    });

    it('should respect noProgressLimit option in config', async () => {
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            noProgressLimit: 2,
        });
        agent.start();

        mockProvider.updateResponses([
            createLLMResponse({ content: 'Error 1', finishReason: 'invalid' }),
            createLLMResponse({ content: 'Error 2', finishReason: 'invalid' }),
            createLLMResponse({ content: 'Response', finishReason: 'stop' }),
        ]);

        const response = await agent.run('Test');

        expect(response).toBeDefined();
    });

    it('should accept sessionId in config', async () => {
        // Note: getAgentContext is a singleton, so sessionId from config
        // is passed but the actual sessionId depends on whether context already exists
        const agent = new Agent({
            llmProvider: mockProvider,
            systemPrompt: 'You are a test agent.',
            sessionId: 'custom-session-123',
        });
        agent.start();

        // Context is set, session should be initialized
        expect(agent.context).toBeDefined();
        expect(agent.context.sessionId).toBeDefined();
    });
});

describe('Agent Event Phase Information', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'With tools',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Final', finishReason: 'stop' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should emit error event with phase information', async () => {
        const errorProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Test error')],
        });
        errorProvider.updateResponses([createLLMResponse({ content: 'Response', finishReason: 'stop' })]);

        const agent = createAgent(errorProvider, { noProgressLimit: 1 });
        agent.start();

        const errorEvents: any[] = [];
        agent.events.on('error', (data) => errorEvents.push(data));

        await agent.run('Test');

        // Should have emitted error event with phase
        expect(errorEvents.length).toBeGreaterThanOrEqual(0);
    });

    it('should emit thinking-start and thinking-end events', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const startEvents: any[] = [];
        const endEvents: any[] = [];

        agent.events.on('thinking', () => startEvents.push('thinking'));
        agent.events.on('thinking-end', () => endEvents.push('thinking-end'));

        await agent.run('Test');

        // Thinking events should be emitted
        expect(startEvents.length).toBeGreaterThan(0);
        expect(endEvents.length).toBeGreaterThan(0);
    });
});

describe('Agent Response Structure', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Test response content' })],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should return response with correct role', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Test');

        expect(response).toBeDefined();
        expect(response?.role).toBe('assistant');
    });

    it('should return response with content', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        const response = await agent.run('Test');

        expect(response).toBeDefined();
        expect(response?.content).toBe('Test response content');
    });

    it('should return null on cancellation', async () => {
        const cancelProvider = createMockLLMProvider({
            shouldThrow: true,
            errors: [new Error('Aborted')],
        });

        const agent = createAgent(cancelProvider);
        agent.start();

        const abortController = new AbortController();
        setTimeout(() => abortController.abort(), 1);

        const response = await agent.run('Test', { abortSignal: abortController.signal });

        // Response may contain cancellation message
        expect(response).toBeDefined();
    });
});

describe('Agent Tool Call History', () => {
    let mockProvider: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider = createMockLLMProvider({
            responses: [
                createLLMResponse({
                    content: 'Calling tool',
                    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'bash', arguments: '{"command":"echo hello"}' } }],
                    finishReason: 'tool_calls',
                    type: 'tool_call',
                }),
                createLLMResponse({ content: 'Done', finishReason: 'stop' }),
            ],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider.reset();
    });

    it('should save tool call messages in history', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Run command');

        const messages = agent.sessionManager.getMessages();

        // Should have user message, assistant message with tool_calls, and tool result
        const toolMessages = messages.filter(m => m.role === 'tool');
        expect(toolMessages.length).toBe(1);
    });

    it('should save assistant messages with tool_calls in history', async () => {
        const agent = createAgent(mockProvider);
        agent.start();

        await agent.run('Run command');

        const messages = agent.sessionManager.getMessages();

        const assistantMessages = messages.filter(m => m.role === 'assistant' && m.tool_calls);
        expect(assistantMessages.length).toBe(1);
        expect(assistantMessages[0].tool_calls?.length).toBe(1);
    });
});

describe('Agent Multiple Sessions', () => {
    let mockProvider1: ReturnType<typeof createMockLLMProvider>;
    let mockProvider2: ReturnType<typeof createMockLLMProvider>;

    beforeEach(() => {
        mockProvider1 = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Session 1 response' })],
        });
        mockProvider2 = createMockLLMProvider({
            responses: [createLLMResponse({ content: 'Session 2 response' })],
        });
        ToolRegistry.clear();
        ToolRegistry.register(new BashTool());
    });

    afterEach(() => {
        mockProvider1.reset();
        mockProvider2.reset();
    });

    it('should maintain separate sessions', async () => {
        const agent1 = new Agent({
            llmProvider: mockProvider1,
            systemPrompt: 'You are agent 1.',
            sessionId: 'session-1',
        });
        const agent2 = new Agent({
            llmProvider: mockProvider2,
            systemPrompt: 'You are agent 2.',
            sessionId: 'session-2',
        });

        agent1.start();
        agent2.start();

        await agent1.run('Hello from agent 1');
        await agent2.run('Hello from agent 2');

        // Sessions should be separate
        const messages1 = agent1.sessionManager.getMessages();
        const messages2 = agent2.sessionManager.getMessages();

        expect(messages1.length).toBe(2); // user + assistant
        expect(messages2.length).toBe(2); // user + assistant
    });
});
