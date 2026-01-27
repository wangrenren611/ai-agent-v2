import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, BaseTool, registerDefaultTools } from './index.js';
import { z } from 'zod';

// 测试用工具
const createTestTool = () => {
    const schema = z.object({
        message: z.string(),
    });

    return class TestTool extends BaseTool<typeof schema> {
        name = 'test';
        description = 'A test tool';
        schema = schema;

        async execute(args: z.infer<typeof this.schema>) {
            return this.success({ response: `Test: ${args.message}` });
        }
    };
};

describe('ToolRegistry', () => {
    let TestToolClass: ReturnType<typeof createTestTool>;

    beforeEach(() => {
        // 每次测试前重新创建测试类
        TestToolClass = createTestTool();

        // 确保默认工具已注册
        if (ToolRegistry.size === 0) {
            registerDefaultTools();
        }
    });

    it('should have bash tool registered by default', () => {
        // 确保 bash 已注册
        registerDefaultTools();
        expect(ToolRegistry.has('bash')).toBe(true);
        const bash = ToolRegistry.get('bash');
        expect(bash).toBeDefined();
        expect(bash?.name).toBe('bash');
    });

    it('should register a new tool', () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        expect(ToolRegistry.has('test')).toBe(true);
        expect(ToolRegistry.get('test')).toBe(tool);
    });

    it('should throw when registering duplicate tool', () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        expect(() => ToolRegistry.register(tool)).toThrow('already registered');
    });

    it('should unregister a tool', () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        expect(ToolRegistry.unregister('test')).toBe(true);
        expect(ToolRegistry.has('test')).toBe(false);
    });

    it('should return undefined for unregistered tool', () => {
        const tool = ToolRegistry.get('nonexistent');
        expect(tool).toBeUndefined();
    });

    it('should get all tools', () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        const tools = ToolRegistry.getAll();
        expect(tools).toContain(tool);

        const names = ToolRegistry.getNames();
        expect(names).toContain('bash');
        expect(names).toContain('test');
    });

    it('should get tool schemas', () => {
        const schemas = ToolRegistry.getSchemas();

        expect(schemas.length).toBeGreaterThan(0);
        expect(schemas[0]).toHaveProperty('type', 'function');
        expect(schemas[0]).toHaveProperty('function');
        expect(schemas[0].function).toHaveProperty('name');
        expect(schemas[0].function).toHaveProperty('description');
        expect(schemas[0].function).toHaveProperty('strict', true);
        expect(schemas[0].function).toHaveProperty('parameters');
    });

    it('should return schemas in OpenAI function calling format', () => {
        const schemas = ToolRegistry.getSchemas();
        const bashSchema = schemas.find((s) => s.function?.name === 'bash');

        expect(bashSchema).toBeDefined();
        expect(bashSchema?.type).toBe('function');
        expect(bashSchema?.function?.strict).toBe(true);
    });

    it('should execute tool via registry', async () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        const result = await ToolRegistry.execute('test', '{ "message": "hello" }');
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ response: 'Test: hello' });
    });

    it('should return error for non-existent tool', async () => {
        const result = await ToolRegistry.execute('nonexistent', '{}');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('should return error for invalid args', async () => {
        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        const result = await ToolRegistry.execute('test', JSON.stringify({ message: 123 }));
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
    });

    it('should report correct size', () => {
        const beforeSize = ToolRegistry.size;

        const tool = new TestToolClass();
        ToolRegistry.register(tool);

        expect(ToolRegistry.size).toBe(beforeSize + 1);
    });

    it('should clear all tools', () => {
        ToolRegistry.clear();
        expect(ToolRegistry.size).toBe(0);
        expect(ToolRegistry.has('bash')).toBe(false);
    });
});
