import { z } from 'zod';
import { BaseTool } from './base';

const schema = z.object({}).optional();

export class CompleteTaskTool extends BaseTool<typeof schema> {
  name = 'complete_task';

  description =
    'Complete the current task and provide a comprehensive summary to the user. Call this when you have successfully completed all requirements.';

  schema = schema;

   async execute(): Promise<string> {
    return 'Task completed';
  }
}

export default CompleteTaskTool;
