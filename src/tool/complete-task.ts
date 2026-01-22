import { z } from 'zod';
import { BaseTool } from './base';

/**
 * 定义特殊的结束信号
 * 外层循环捕获此异常以获取最终结果并跳出 while 循环
 */

const schema = z.object({
  finalAnswer: z.string()
    .min(1, "Final answer cannot be empty.")
    .describe('The final response to the user. Use this for both task results and simple greetings.'),
});

export default class CompleteTaskTool extends BaseTool<typeof schema> {
  name = 'complete_task';

  description = 
    "MANDATORY: Call this tool to deliver your final response and end the process. " +
    "This includes answers to complex tasks, simple questions, or greetings.";

  schema = schema;

  async execute(input: z.infer<typeof schema>): Promise<string> {
    const { finalAnswer} = input;

    // 1. 业务逻辑校验
    if (!finalAnswer.length ) {
      return "Error: The final answer is too short. Please provide a more complete response.";
    }

    return finalAnswer;
  }
}