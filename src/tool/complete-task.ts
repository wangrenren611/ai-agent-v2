import { z } from 'zod';
import { BaseTool, ToolResult } from './base';

const schema = z.object({
  finalAnswer: z.string().min(1, "Final answer cannot be empty.").describe('The final response to the user'),
});

export default class CompleteTaskTool extends BaseTool<typeof schema> {
  name = 'complete_task';
  description = "MANDATORY: Call this tool to deliver your final response and end the process.";

  schema = schema;

  async execute(input: z.infer<typeof schema>): Promise<ToolResult> {
    const { finalAnswer } = input;

    // === 业务错误：答案太短 ===
    if (!finalAnswer.length) {
      return this.fail(
        'ANSWER_TOO_SHORT',
        { message: 'The final answer is too short. Please provide a more complete response.' }
      );
    }

    return this.success({ finalAnswer });
  }
}
