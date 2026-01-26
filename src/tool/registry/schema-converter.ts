/**
 * Zod Schema 转换器
 * 将 Zod schema 转换为 JSON Schema 格式
 */

import type { z } from 'zod';

/**
 * Schema 转换器类
 */
export class SchemaConverter {
  /**
   * 将 Zod schema 转换为 JSON Schema 格式
   */
  static zodToJsonSchema(schema: any): Record<string, unknown> {
    // 基础实现，处理常见类型
    if (schema._def?.typeName === 'ZodObject') {
      return this.convertZodObject(schema);
    }

    return { type: 'object', properties: {}, additionalProperties: false };
  }

  /**
   * 转换 ZodObject
   */
  private static convertZodObject(schema: any): Record<string, unknown> {
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

  /**
   * 将 Zod 类型转换为 JSON Schema 类型
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
        return this.convertUnion(def, key);

      case 'ZodEffects':
        return this.convertEffects(def, key);

      default:
        if (typeName !== undefined) {
          console.warn(`Unknown Zod type: ${typeName} for field: ${key}`);
        } else {
          console.warn(`Undefined Zod type definition for field: ${key}, def:`, def);
        }
        return {};
    }
  }

  /**
   * 转换 Union 类型
   */
  private static convertUnion(def: any, key?: string): Record<string, unknown> {
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
  }

  /**
   * 转换 ZodEffects
   */
  private static convertEffects(def: any, key?: string): Record<string, unknown> {
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
  }

  /**
   * 从 JSON Schema 生成示例值
   */
  static generateExampleValue(schema: unknown, key: string): unknown {
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
          if ('properties' in s && s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) {
            const nestedExample: Record<string, unknown> = {};
            const required = (s.required || []) as string[];
            for (const [k, v] of Object.entries(s.properties)) {
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
