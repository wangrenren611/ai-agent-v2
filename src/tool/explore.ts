import { z } from 'zod';
import { BaseTool, ToolResult } from './base';

const schema = z.object({
  prompt: z.string().describe('Specific description of the exploration task'),
  session_id: z.string().optional().describe('Optional session ID'),
});

export class ExploreTool extends BaseTool<typeof schema> {
  name = 'explore';
  description = `Fast READ-ONLY explorer for searching and understanding codebases.

When to use:
- Finding all API endpoints
- Where is authentication implemented?
- Researching the project

When NOT to use:
- Use Read/Glob for specific file paths
- Use grep for keyword searches`;

  schema = schema;

  async execute(args: z.infer<typeof schema>): Promise<ToolResult> {
    return this.success({
      prompt: args.prompt,
      session_id: args.session_id,
      message: 'Explore completed. Use grep, glob, and read_file tools directly for exploration.',
    });
  }
}

export default ExploreTool;
