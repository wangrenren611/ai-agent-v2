/**
 * JSON Schema to Zod Converter
 *
 * 将 JSON Schema 转换为 Zod schema
 * 用于将 MCP 工具的输入参数定义适配到本地的 BaseTool 接口
 */

import { z } from 'zod';

// =============================================================================
// JSON Schema to Zod Conversion
// =============================================================================

/**
 * 将 JSON Schema 转换为 Zod schema
 *
 * @param jsonSchema - JSON Schema 对象
 * @returns Zod schema
 */
export function jsonSchemaToZod(jsonSchema: Record<string, unknown>): z.ZodType<any> {
  return convertSchema(jsonSchema);
}

/**
 * 递归转换 JSON Schema 为 Zod schema
 */
function convertSchema(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string | string[];

  // 处理多种类型
  if (Array.isArray(type)) {
    // 对于多种类型，使用 z.union()
    const schemas = type.map(t => convertSchema({ ...schema, type: t }));
    return z.union([schemas[0], schemas[1]] as any);
  }

  switch (type) {
    case 'object':
      return convertObjectSchema(schema);

    case 'array':
      return convertArraySchema(schema);

    case 'string':
      return convertStringSchema(schema);

    case 'number':
    case 'integer':
      return convertNumberSchema(schema);

    case 'boolean':
      return z.boolean();

    case 'null':
      return z.null();

    default:
      // 处理引用类型 ($ref)
      if ('$ref' in schema) {
        throw new Error('$ref is not supported in JSON Schema conversion');
      }

      // 处理 anyOf
      if ('anyOf' in schema && Array.isArray(schema.anyOf)) {
        const schemas = (schema.anyOf as any[]).map(s => convertSchema(s));
        return z.union([schemas[0], schemas[1]] as any);
      }

      // 处理 allOf
      if ('allOf' in schema && Array.isArray(schema.allOf)) {
        // allOf 需要合并所有 schema，这里简化处理
        return convertSchema(schema.allOf[0] as any);
      }

      // 处理 oneOf
      if ('oneOf' in schema && Array.isArray(schema.oneOf)) {
        const schemas = (schema.oneOf as any[]).map(s => convertSchema(s));
        return z.discriminatedUnion('type', schemas as any);
      }

      // 默认返回 any
      return z.any();
  }
}

/**
 * 转换对象类型
 */
function convertObjectSchema(schema: Record<string, unknown>): z.ZodTypeAny {
  const properties = schema.properties as Record<string, unknown> | undefined;
  const required = schema.required as string[] | undefined;
  const additionalProperties = schema.additionalProperties as boolean | Record<string, unknown> | undefined;

  const shape: Record<string, z.ZodTypeAny> = {};

  if (properties) {
    for (const [key, propSchema] of Object.entries(properties)) {
      const propSchemaRecord = propSchema as Record<string, unknown>;
      let zodSchema = convertSchema(propSchemaRecord);

      // 检查是否可选
      const isRequired = required?.includes(key);
      if (!isRequired) {
        zodSchema = zodSchema.optional();
      }

      // 处理默认值
      if ('default' in propSchemaRecord) {
        zodSchema = (zodSchema as any).default(propSchemaRecord.default);
      }

      // 处理描述
      if ('description' in propSchemaRecord) {
        zodSchema = (zodSchema as any).describe(propSchemaRecord.description as string);
      }

      shape[key] = zodSchema;
    }
  }

  let zodObject = z.object(shape);

  // 处理 additionalProperties
  if (additionalProperties === false) {
    zodObject = (zodObject as any).strict();
  } else if (typeof additionalProperties === 'object') {
    // 允许特定类型的额外属性
    const additionalSchema = convertSchema(additionalProperties);
    zodObject = (zodObject as any).catchall(additionalSchema);
  } else if (additionalProperties === true) {
    zodObject = (zodObject as any).catchall(z.any());
  }

  return zodObject;
}

/**
 * 转换数组类型
 */
function convertArraySchema(schema: Record<string, unknown>): z.ZodTypeAny {
  const itemsSchema = schema.items as Record<string, unknown> | undefined;

  if (!itemsSchema) {
    return z.array(z.any());
  }

  const itemSchema = convertSchema(itemsSchema);
  return z.array(itemSchema);
}

/**
 * 转换字符串类型
 */
function convertStringSchema(schema: Record<string, unknown>): z.ZodTypeAny {
  let zodString = z.string();

  // 处理枚举
  if ('enum' in schema && Array.isArray(schema.enum)) {
    return z.enum(schema.enum as [string, ...string[]]);
  }

  // 处理格式约束
  if (schema.format === 'email') {
    zodString = zodString.email();
  } else if (schema.format === 'uri' || schema.format === 'url') {
    zodString = zodString.url();
  } else if (schema.format === 'uuid') {
    zodString = zodString.uuid();
  }

  // 处理长度约束
  if (typeof schema.minLength === 'number') {
    zodString = zodString.min(schema.minLength);
  }
  if (typeof schema.maxLength === 'number') {
    zodString = zodString.max(schema.maxLength);
  }

  // 处理正则
  if ('pattern' in schema && typeof schema.pattern === 'string') {
    zodString = zodString.regex(new RegExp(schema.pattern));
  }

  return zodString;
}

/**
 * 转换数字类型
 */
function convertNumberSchema(schema: Record<string, unknown>): z.ZodNumber {
  let zodNumber = schema.type === 'integer' ? z.number().int() : z.number();

  // 处理范围约束
  if (typeof schema.minimum === 'number') {
    zodNumber = zodNumber.min(schema.minimum);
  }
  if (typeof schema.maximum === 'number') {
    zodNumber = zodNumber.max(schema.maximum);
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    zodNumber = zodNumber.gt(schema.exclusiveMinimum);
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    zodNumber = zodNumber.lt(schema.exclusiveMaximum);
  }

  return zodNumber;
}
