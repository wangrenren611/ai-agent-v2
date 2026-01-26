import { BaseTool, ToolResult } from "./base";
import { AgentContext } from "../context";

// 重新导出供外部使用
export { BaseTool, ToolResult };

/**
 * 工具注册表类
 *
 * 单例模式，管理所有可用的工具
 */
export class ToolRegistry {
    /** 已注册的工具映射 */
    private static tools: Map<string, BaseTool<any>> = new Map();
    private static context: { sessionId?: string; sessionPath?: string; allowedTools?: string[] } = {};
    /** AgentContext 实例 */
    private static agentContext: AgentContext | null = null;

    /** 私有构造函数，防止外部实例化 */
    private constructor() {}

    /**
     * 设置 AgentContext 实例
     */
    static setAgentContext(context: AgentContext): void {
        this.agentContext = context;

        // 自动同步 sessionId
        this.setContext({
            sessionId: context.sessionId,
            sessionPath: context.sessionDir,
        });
    }

    /**
     * 获取 AgentContext 实例
     */
    static getAgentContext(): AgentContext | null {
        return this.agentContext;
    }

    /**
     * 注册工具
     *
     * 支持单个工具或工具数组
     *
     * @param tool - 工具实例或工具数组
     * @throws 如果工具名称已存在
     */
    static register<T extends BaseTool<any>>(tool: T | T[]): void {
        const tools = Array.isArray(tool) ? tool : [tool];
        for (const t of tools) {
            if (this.tools.has(t.name)) {
                throw new Error(`Tool "${t.name}" is already registered`);
            }
            this.tools.set(t.name, t);

            // 注入 context 到工具实例
            if (this.agentContext) {
                t.sessionId = this.agentContext.sessionId;
            }
        }
    }

    /**
     * 注销工具
     *
     * @param name - 工具名称
     * @returns 是否成功注销
     */
    static unregister(name: string): boolean {
        return this.tools.delete(name);
    }

    /**
     * 根据名称获取工具
     *
     * @param name - 工具名称
     * @returns 工具实例，如果不存在则返回 undefined
     */
    static get<T extends BaseTool<any> = BaseTool<any>>(name: string): T | undefined {
        return this.tools.get(name) as T | undefined;
    }

    /**
     * 获取所有已注册的工具
     *
     * @returns 工具实例数组
     */
    static getAll(): BaseTool<any>[] {
        return Array.from(this.tools.values());
    }

    /**
     * 获取所有工具的名称
     *
     * @returns 工具名称数组
     */
    static getNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /**
     * 检查工具是否已注册
     *
     * @param name - 工具名称
     * @returns 是否已注册
     */
    static has(name: string): boolean {
        return this.tools.has(name);
    }

    /**
     * 获取已注册工具的数量
     *
     * @returns 工具数量
     */
    static get size(): number {
        return this.tools.size;
    }

    /**
     * 清空所有已注册的工具
     *
     * @warning 这通常只在测试中使用
     */
    static clear(): void {
        this.tools.clear();
    }

    static setContext(context: { sessionId?: string; sessionPath?: string; allowedTools?: string[] }): void {
        const next = { ...this.context, ...context };
        if ('allowedTools' in context && context.allowedTools === undefined) {
            delete (next as any).allowedTools;
        }
        this.context = next;

        // 同步到所有工具实例
        for (const tool of this.tools.values()) {
            tool.sessionId = next.sessionId;
        }
    }

    static getContext(): { sessionId?: string; sessionPath?: string; allowedTools?: string[] } {
        return this.context;
    }

    /**
     * 执行指定工具
     *
     * @param name - 工具名称
     * @param args - 工具参数（字符串或对象形式）
     * @returns 统一的工具执行结果
     */
    static async execute(name: string, args: string | Record<string, unknown>): Promise<ToolResult> {
        // 如果是字符串，解析为对象
        const argsObj = typeof args === 'string' ? JSON.parse(args) : args;
        const tool = this.get(name);

        if (!tool) {
            return {
                success: false,
                error: `Tool "${name}" not found`,
                metadata: { toolName: name },
            };
        }

        const allowed = this.context.allowedTools;
        if (allowed && !allowed.includes(name)) {
            return {
                success: false,
                error: `Tool "${name}" is not allowed in this context`,
                metadata: { toolName: name },
            };
        }

        // 通过 AgentContext 检查是否需要确认
        if (this.agentContext) {
            const permission = await this.agentContext.canExecuteTool(name, argsObj);
            if (!permission.allowed) {
                return {
                    success: false,
                    error: permission.reason || `Tool "${name}" was not executed`,
                    metadata: {
                        toolName: name,
                        requiresConfirmation: permission.requiresConfirmation,
                    },
                };
            }
        }

        const startTime = Date.now();

        try {
            // 验证参数
            const parsed = tool.schema.safeParse(argsObj);

            if (!parsed.success) {
                const errors = parsed.error.errors.map((e: { message: string }) => e.message).join(', ');
                return {
                    success: false,
                    error: `Invalid arguments: ${errors}`,
                    metadata: {
                        toolName: name,
                        duration: Date.now() - startTime,
                    },
                };
            }

            const result = await tool.execute(parsed.data);
            const duration = Date.now() - startTime;

            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    toolName: name,
                    duration,
                },
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: `Tool execution error: ${errorMsg}`,
                metadata: {
                    toolName: name,
                    duration,
                },
            };
        }
    }


    /**
     * 获取工具的 schema（用于 LLM 函数调用）
     *
     * 返回符合 OpenAI function calling 格式：
     * https://platform.openai.com/docs/guides/function-calling
     *
     * @returns 所有工具的 schema 数组
     */
    static getSchemas(): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            strict?: boolean;
            parameters: Record<string, unknown>;
        };
    }> {
        return this.getAll().map(tool => {
            // 将 zod schema 转换为 JSON Schema 格式
            const zodSchema = tool.schema;
            const jsonSchema = this.zodToJsonSchema(zodSchema);

            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    strict: true,
                    parameters: jsonSchema,
                },
            };
        });
    }

    /**
     * 将 Zod schema 转换为 JSON Schema 格式
     *
     * @param schema - Zod schema
     * @returns JSON Schema 对象
     */
    private static zodToJsonSchema(schema: any): Record<string, unknown> {
        // 基础实现，处理常见类型
        if (schema._def?.typeName === 'ZodObject') {
            const shape = schema._def.shape();
            const properties: Record<string, unknown> = {};
            const required: string[] = [];

            for (const [key, value] of Object.entries(shape)) {
                const def = (value as any)._def;
                properties[key] = this.zodTypeToJsonSchema(def, key);

                // 检查是否是可选字段
                const isOptional = (value as any)._def?.typeName === 'ZodOptional' ||
                                   (value as any).isOptional?.();
                if (!isOptional) {
                    required.push(key);
                }
            }

            return {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
                additionalProperties: false,
            };
        }

        return { type: 'object', properties: {}, additionalProperties: false };
    }

    /**
     * 将 Zod 类型转换为 JSON Schema 类型
     *
     * @param def - Zod 类型定义
     * @param key - 字段名（用于错误信息）
     * @returns JSON Schema 类型定义
     */
    private static zodTypeToJsonSchema(def: any, key?: string): Record<string, unknown> {
        const typeName = def?.typeName;

        switch (typeName) {
            case 'ZodString':
                return { type: 'string' };

            case 'ZodNumber':
                return { type: 'number' };

            case 'ZodBoolean':
                return { type: 'boolean' };

            case 'ZodNull':
                return { type: 'null' };

            case 'ZodArray':
                const itemType = this.zodTypeToJsonSchema(def.type?._def || def.type, key);
                return {
                    type: 'array',
                    items: itemType,
                };

            case 'ZodObject':
                return this.zodToJsonSchema({ _def: def });

            case 'ZodOptional':
            case 'ZodNullable':
            case 'ZodDefault':
                // innerType 是 Zod 对象，需要获取其 _def
                const wrappedType = def.innerType || def.schema || def.type;
                if (!wrappedType) {
                    console.warn(`Missing wrapped type for field: ${key}, def:`, def);
                    return {};
                }
                return this.zodTypeToJsonSchema(wrappedType._def || wrappedType, key);

            case 'ZodEnum':
                return {
                    type: 'string',
                    enum: def.values,
                };

            case 'ZodLiteral':
                return {
                    type: typeof def.value,
                    const: def.value,
                };

            case 'ZodUnion':
            case 'ZodDiscriminatedUnion':
                // 使用 oneOf 替代 anyOf，LLM 理解更好
                const options = def.options?.map((opt: any) => this.zodTypeToJsonSchema(opt._def || opt));
                const result: Record<string, unknown> = { oneOf: options };

                // 为 discriminated union 添加示例，帮助 LLM 理解
                if (def.discriminator && options?.length > 0) {
                    const examples: unknown[] = [];
                    for (const opt of options) {
                        if (opt && typeof opt === 'object' && 'properties' in opt) {
                            const example: Record<string, unknown> = {};
                            const props = opt.properties as Record<string, unknown>;
                            const required = (opt as any).required as string[] || [];

                            // 为必需字段生成示例
                            for (const key of required) {
                                example[key] = this.generateExampleValue(props[key], key);
                            }
                            // 也为一些重要的可选字段生成示例
                            for (const [key, schema] of Object.entries(props)) {
                                if (!(key in example) && ['content', 'status', 'priority'].includes(key)) {
                                    example[key] = this.generateExampleValue(schema, key);
                                }
                            }

                            if (Object.keys(example).length > 0) {
                                examples.push(example);
                            }
                        }
                    }
                    if (examples.length > 0) {
                        result.examples = examples;
                    }
                }
                return result;

            case 'ZodEffects':
                // 处理带描述的字段
                const effectType = def.innerType || def.schema || def.type;
                if (!effectType) {
                    console.warn(`Missing effect inner type for field: ${key}, def:`, def);
                    return {};
                }
                const innerSchema = this.zodTypeToJsonSchema(effectType._def || effectType, key);
                if (def.description) {
                    return { ...innerSchema, description: def.description };
                }
                return innerSchema;

            default:
                // 未知类型，使用 any
                if (typeName !== undefined) {
                    console.warn(`Unknown Zod type: ${typeName} for field: ${key}`);
                } else {
                    console.warn(`Undefined Zod type definition for field: ${key}, def:`, def);
                }
                return {};
        }
    }

    /**
     * 从 JSON Schema 生成示例值
     */
    private static generateExampleValue(schema: unknown, key: string): unknown {
        if (!schema || typeof schema !== 'object') {
            return null;
        }

        const s = schema as Record<string, unknown>;

        // 如果有 const 值，直接使用
        if ('const' in s) {
            return s.const;
        }

        // 如果有示例值，直接使用
        if ('example' in s) {
            return s.example;
        }

        // 如果是 enum，使用第一个值
        if ('enum' in s && Array.isArray(s.enum) && s.enum.length > 0) {
            return s.enum[0];
        }

        // 根据类型生成示例
        if ('type' in s) {
            switch (s.type) {
                case 'string':
                    // 根据字段名生成更合理的示例
                    if (key === 'content') return 'Complete task documentation';
                    if (key === 'status') return 'pending';
                    if (key === 'priority') return 'medium';
                    if (key === 'id') return 't_1';
                    if (key === 'op') return 'add';
                    return `example_${key}`;
                case 'number':
                    return 1;
                case 'boolean':
                    return true;
                case 'array':
                    return [];
                case 'object':
                    // 递归生成嵌套对象的示例
                    if ('properties' in s && s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) {
                        const nestedExample: Record<string, unknown> = {};
                        const required = (s.required || []) as string[];
                        for (const [k, v] of Object.entries(s.properties)) {
                            // 只为必需字段或常见字段生成示例
                            if (required.includes(k) || ['content', 'status', 'priority'].includes(k)) {
                                nestedExample[k] = this.generateExampleValue(v, k);
                            }
                        }
                        return nestedExample;
                    }
                    return {};
                default:
                    return null;
            }
        }

        return null;
    }


}
