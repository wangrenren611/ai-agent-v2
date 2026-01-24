import { BaseTool, ToolOutput } from "./base";

/**
 * 工具注册表类
 *
 * 单例模式，管理所有可用的工具
 */
export class ToolRegistry {
    /** 已注册的工具映射 */
    private static tools: Map<string, BaseTool<any>> = new Map();
    private static context: { sessionId?: string; sessionPath?: string; allowedTools?: string[] } = {};

    /** 私有构造函数，防止外部实例化 */
    private constructor() {}

    /**
     * 注册工具
     *
     * 支持单个工具或工具数组
     *
     * @param tool - 工具实例或工具数组
     * @throws 如果工具名称已存在
     *
     * @example
     * ```ts
     * // 注册单个工具
     * ToolRegistry.register(new BashTool());
     *
     * // 批量注册工具
     * ToolRegistry.register([new BashTool(), new GrepTool()]);
     * ```
     */
    static register<T extends BaseTool<any>>(tool: T | T[]): void {
        const tools = Array.isArray(tool) ? tool : [tool];
        for (const t of tools) {
            if (this.tools.has(t.name)) {
                throw new Error(`Tool "${t.name}" is already registered`);
            }
            this.tools.set(t.name, t);
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
    }

    static getContext(): { sessionId?: string; sessionPath?: string; allowedTools?: string[] } {
        return this.context;
    }

    /**
     * 执行指定工具
     *
     * @param name - 工具名称
     * @param args - 工具参数
     * @returns 执行结果
     * @throws 如果工具不存在或参数无效
     */
    static async execute(name: string, args: unknown): Promise<ToolOutput> {
        const tool = this.get(name);
        if (!tool) {
            return `Tool "${name}" not found`;
        }
        const allowed = this.context.allowedTools;
        if (allowed && !allowed.includes(name)) {
            return `Tool "${name}" is not allowed in this context`;
        }

        // 验证参数
        const parsed = tool.schema.safeParse(args);

        if (!parsed.success) {
            return `Invalid arguments for tool "${name}": ${parsed.error.errors.map((e: { message: string }) => e.message).join(', ')}`;
        }

        return await tool.execute(parsed.data);
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
                return {
                    anyOf: def.options?.map((opt: any) => this.zodTypeToJsonSchema(opt._def || opt)),
                };

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
}
