/**
 * Explore Tool
 *
 * 快速只读探索工具，用于搜索和理解代码库。
 *
 * 用途：
 * - 使用 glob 模式查找文件
 * - 使用正则表达式搜索代码
 * - 读取和分析文件内容
 * - 快速代码库导航和理解
 *
 * 工具：glob, grep, read_file, web_search（无写入权限）
 *
 * @example
 * ```bash
 * # 查找所有 API 端点
 * explore({ prompt: 'Find all API endpoints' })
 *
 * # 查找认证实现位置
 * explore({ prompt: 'Where is auth implemented?' })
 *
 * # 查看特定目录下的所有 TypeScript 文件
 * explore({ prompt: 'Show me all TypeScript files in src/' })
 * ```
 */

import { z } from 'zod';
import { SubAgentTool, SubAgentConfig } from './subagent';

/**
 * Explore 子代理配置
 * 导出供 TaskTool 复用
 */


export const EXPLORE_CONFIG: SubAgentConfig = {
  name: 'explore',
  description: 'Fast READ-ONLY explorer for searching and understanding codebases',
  tools: ['grep', 'glob', 'read_file'],
  systemPrompt: [
    `You are a file search specialist. You excel at thoroughly navigating and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path you need to read
- Use Bash for file operations like copying, moving, or listing directory contents
- Adapt your search approach based on the thoroughness level specified by the caller
- Return file paths as absolute paths in your final response
- For clear communication, avoid using emojis
- Do not create any files, or run bash commands that modify the user's system state in any way

Complete the user's search request efficiently and report your findings clearly.


`,
  ].join('\n\n'),
};

const schema = z.object({
  prompt: z.string().describe('Specific description of the exploration task'),
  session_id: z.string().describe('Optional session ID for continuing a previous session').optional(),
});

/**
 * Explore 工具 - 快速只读探索工具
 *
 * 专门用于代码库的只读探索，无写入权限。
 * 这是默认的探索工具，可以直接调用 explore({ prompt: '...' })
 */
export class ExploreTool extends SubAgentTool<typeof schema> {
  name = 'explore';

  description = `
Fast READ-ONLY explorer for searching and understanding codebases.

Use this for:
- Finding files using glob patterns
- Searching code with regex patterns
- Reading and analyzing file contents
- Quick codebase navigation and understanding

Tools: glob, grep, read_file (NO write access)

Examples:
- "Find all API endpoints"
- "Where is auth implemented?"
- "Show me all TypeScript files in src/"
  `.trim();

  schema = schema;

  protected getConfig(): SubAgentConfig {
    return EXPLORE_CONFIG;
  }

  protected getSessionId(args: z.infer<typeof schema>): string | undefined {
    return args.session_id;
  }

  protected buildTaskPrompt(args: z.infer<typeof schema>): string {
    return [
      `Task: Explore codebase`,
      'Work autonomously using the allowed tools.',
      'Do not ask follow-up questions.',
      'Return a concise summary with findings and file:line references.',
      args.prompt,
    ].join('\n\n');
  }
}

export default ExploreTool;
