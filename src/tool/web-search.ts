import { z } from 'zod';
import { BaseTool } from './base';
import { tavily } from '@tavily/core';


export class WebSearchTool extends BaseTool<any> {
  name = "web_search";
  description = "Performs a web search to obtain the latest or uncertain information. Provide a query (include key entities, time, location, etc. as qualifiers), and optionally maxResults (1–10). Returns a list of results with title, URL, truncated summary, and relevance score to quickly locate trustworthy sources and answer accordingly.";
  schema = z.object({
    query: z.string().describe("Search query content"),
    maxResults: z.number().min(1).max(10).nullable().default(5).describe("Maximum number of results")
  });

  private async tryRealSearch(query: string, maxResults: number): Promise<string> {
    if (!process.env.TAVILY_API_KEY) {
      return 'error: TAVILY_API_KEY 环境变量未设置'
    }


    try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const response = await tvly.search(query, {
       maxResults: maxResults||5,
     });

    // 优化：限制返回内容长度，避免token累积过多
    const results = response?.results || [];
    const summarizedResults = results.map((r: any) => ({
      title: r.title,
      url: r.url,
      // 截断内容，最多300字符
      content: r.content ? r.content.slice(0, 300) + (r.content.length > 300 ? '...' : '') : '',
      score: r.score
    }));

    return `
【web search result】:
Query: ${response.query}
Results found: ${results.length}
Search time: ${response.responseTime}s

Results:
${JSON.stringify(summarizedResults, null, 2)}
    `.trim();

    } catch (error) {
      console.error('网络搜索失败:', error);
      return `【web search failed】: ${error}`;
    }
  }

 

  async execute({ query, maxResults = 3 }: { 
    query: string; 
    maxResults?: number;
  }): Promise<string> {
    console.log(`🔍 搜索请求: "${query}"`);
    return await this.tryRealSearch(query, maxResults);
  }
}
