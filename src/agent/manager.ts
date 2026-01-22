// 智能体配置结构
interface Info {
  name: string                      // 智能体名称
  mode: "primary" | "subagent" | "all"  // 模式
  description?: string              // 描述
  //permission: Ruleset               // 权限规则
  prompt?: string;                   // 专用提示词
  temperature?: number              // 温度参数
  steps: number                    // 最大步骤数
  model: string                    // 模型ID
  provider: 'glm'|'deepseek'|'kimi'// 提供商ID
};

export class AgentManager {
  private agents = new Map<string,Info>();

  constructor(agents: Map<string,Info>) {
    // 初始化智能体配置
    this.agents = agents;
  }
  
   // 获取智能体配置
  get(name: string): Info {
    const agent = this.agents.get(name);

    if (!agent) {
      throw new Error(`Agent ${name} not found`);
    }

    return agent;
  }
  
  // 列出所有智能体
    list(): Info[] {
    return Array.from(this.agents.values());
  }
  
  // 获取默认智能体
   defaultAgents():Info {
    const defaultAgent = this.agents.get('build');
    if (!defaultAgent) {
      throw new Error(`Default agent 'build' not found`);
    }

    return defaultAgent;
  }



  // AI 生成新智能体
  // async function generate(input: { description: string; model?: { ... } }){
  
  // }
}
