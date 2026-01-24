import { z } from 'zod';

export type ToolOutput = string | {  metadata: Record<string, any>; output: string };
export type ToolContext = {
  environment: string;
  platform: string;
  time: string;
  sessionId?: string;
  sessionPath?: string;
};
export abstract class BaseTool<T extends z.ZodType> {
  abstract name: string;
  abstract description: string;
  abstract schema: T;
  abstract execute(args?: z.infer<T>): Promise<ToolOutput>|ToolOutput;
  protected getContext(): ToolContext {
    return {
      environment: process.cwd(),
      platform: process.platform,
      time: new Date().toISOString(),
    };
  }
}
