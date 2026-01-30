import { z } from 'zod';
import { BaseTool, ToolResult } from './base';
import { tavily } from '@tavily/core';

export class WebSearchTool extends BaseTool<any> {
  name = "web_search";
  description = "Performs a web search using Tavily API.";
  schema = z.object({
    query: z.string().describe("Search query content"),
    maxResults: z.number().min(1).max(10).nullable().default(5).describe("Maximum number of results")
  });

  async execute({ query, maxResults = 3 }: {
    query: string;
    maxResults?: number;
  }): Promise<ToolResult> {
    // console.log(`🔍 搜索请求: "${query}"`);

    // === 业务错误：API Key 未配置 ===
    if (!process.env.TAVILY_API_KEY) {
      return this.fail('API_KEY_MISSING', { message: 'TAVILY_API_KEY environment variable not set' });
    }

    // === 底层异常：网络请求失败 ===
    let response: any;
    try {
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
      response = await tvly.search(query, { maxResults: maxResults || 5 });
    } catch (error) {
      throw new Error(`Web search request failed: ${error}`);
    }

    const results = response?.results || [];

    // === 业务错误：无结果 ===
    if (results.length === 0) {
      return this.success({
        query: response.query,
        results: [],
        responseTime: response.responseTime,
      });
    }

    const summarizedResults = results.map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content || '',
      score: r.score
    }));

    return this.success({
      query: response.query,
      results: summarizedResults,
      responseTime: response.responseTime,
    });
  }
}
