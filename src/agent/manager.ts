import { OpenAIProvider } from '../providers/openai';
import { SessionManager } from '../session-v2';
import { registerDefaultToolsAsync, ToolRegistry } from '../tool';
import Agent from './index';

// 智能体配置结构
interface Info {
  name: string                      // 智能体名称
  mode: "primary" | "subagent" | "all"  // 模式
  description?: string              // 描述
  //permission: Ruleset               // 权限规则
  prompt?: string;                   // 专用提示词
  temperature?: number              // 温度参数
  topP?: number                     // Top P 参数
  steps?: number                    // 最大步骤数
  model?: {                         // 模型配置
    modelID: string
    providerID: string
  }
}
export class AgentManager {
  private agents = new Map<string,Info>({   
     'build':{
      name: 'build',
      mode: 'primary',
      description: '用于构建项目的智能体',
      // permission: {
      //   rules: [
      //     { action: 'read', resource: 'project' },
      //     { action: 'write', resource: 'project' },
      //   ],
      // },
      prompt: customPrompt,
      temperature: 0.3,
      topP: 0.9,
      steps: 1000,
      model: 'glm-4.7',
    },
  });

  constructor() {
    // 初始化智能体
    this.agents.forEach((info, name) => {
      new Agent({
        name,
        info,
      });
    });
  }
  init() {
     await registerDefaultToolsAsync();
     // 5. 初始化 LLM Provider
     const llmProvider = new OpenAIProvider({
         apiKey: config.deepseekApiKey,
         baseURL: config.deepseekBaseUrl,
     });
       
 
    const sessionManager = new SessionManager({
        sessionId:new Date().getTime().toString(),
        llmProvider,
    });
    
   await sessionManager.init();
 
     ToolRegistry.setContext({
         sessionId: sessionManager.id,
         sessionPath: sessionManager.sessionPath,
     });
  }
  
   // 获取智能体配置
  async function get(name: string){
    return ;
  }

  // 列出所有智能体
  async function list(): Info[]

  // 获取默认智能体
  async function defaultAgent(): string

  // AI 生成新智能体
  async function generate(input: { description: string; model?: { ... } })
}
