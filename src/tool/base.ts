import { z } from 'zod';

export type ToolOutput = string | {  metadata: Record<string, any>; output: string };
export abstract class BaseTool<T extends z.ZodType> {
  abstract name: string;
  abstract description: string;
  abstract schema: T;
  abstract execute(args?: z.infer<T>): Promise<ToolOutput>|ToolOutput;
}