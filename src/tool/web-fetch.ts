import { z } from 'zod';
import { BaseTool, ToolResult } from './base.js';
import TurndownService from 'turndown';

// 声明 HTMLRewriter 全局类型
declare const HTMLRewriter: any;

// 常量定义
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_TIMEOUT = 30 * 1000; // 30秒
const MAX_TIMEOUT = 120 * 1000; // 120秒

// 定义 schema
const schema = z.object({
  url: z.string().describe('The URL to fetch content from'),
  format: z.enum(['text', 'markdown', 'html']).default('markdown').describe('The format to return the content in (text, markdown, or html). Defaults to markdown.'),
  timeout: z.number().describe('Optional timeout in seconds (max 120)').optional(),
});

export class WebFetchTool extends BaseTool<typeof schema> {
  name = 'web_fetch';
  description = 'Fetch webpage content from a URL and return it in the specified format (markdown, text, or html).';
  schema = schema;

  async execute(params: z.infer<typeof schema>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // 验证 URL 格式
      if (!params.url.startsWith('http://') && !params.url.startsWith('https://')) {
        return this.fail('INVALID_URL', {
          message: 'URL must start with http:// or https://',
          duration: Date.now() - startTime,
        });
      }

      // 计算超时时间
      const timeoutMs = Math.min((params.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT);

      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // 根据请求格式构建 Accept 头
      let acceptHeader = '*/*';
      switch (params.format) {
        case 'markdown':
          acceptHeader = 'text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1';
          break;
        case 'text':
          acceptHeader = 'text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1';
          break;
        case 'html':
          acceptHeader = 'text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1';
          break;
      }

      // 发起请求
      const response = await fetch(params.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': acceptHeader,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      // 清除超时定时器
      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        return this.fail('FETCH_FAILED', {
          message: `Request failed with status code: ${response.status}`,
          duration: Date.now() - startTime,
          statusCode: response.status,
        });
      }

      // 检查内容长度
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
        return this.fail('RESPONSE_TOO_LARGE', {
          message: 'Response too large (exceeds 5MB limit)',
          duration: Date.now() - startTime,
        });
      }

      // 读取响应内容
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
        return this.fail('RESPONSE_TOO_LARGE', {
          message: 'Response too large (exceeds 5MB limit)',
          duration: Date.now() - startTime,
        });
      }

      // 解码内容
      const content = new TextDecoder().decode(arrayBuffer);
      const contentType = response.headers.get('content-type') || '';
      const title = `${params.url} (${contentType})`;

      // 根据请求格式处理内容
      let output: string;
      switch (params.format) {
        case 'markdown':
          // 如果是 HTML，转换为 Markdown
          if (contentType.includes('text/html')) {
            output = convertHTMLToMarkdown(content);
          } else {
            output = content;
          }
          break;
        case 'text':
          // 如果是 HTML，提取纯文本
          if (contentType.includes('text/html')) {
            output = await extractTextFromHTML(content);
          } else {
            output = content;
          }
          break;
        case 'html':
        default:
          output = content;
          break;
      }

      return this.success({
        title,
        output,
        url: params.url,
        format: params.format,
        contentType,
        size: arrayBuffer.byteLength,
      }, {
        duration: Date.now() - startTime,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.fail('FETCH_ERROR', {
        message: `Web fetch failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      });
    }
  }
}

/**
 * 从 HTML 提取纯文本
 */
async function extractTextFromHTML(html: string): Promise<string> {
  let text = '';
  let skipContent = false;

  // 使用 HTMLRewriter 处理 HTML
  const rewriter = new HTMLRewriter()
    // 处理需要跳过的元素
    .on('script, style, noscript, iframe, object, embed', {
      element(element: any) {
        skipContent = true;
      },
      text(input: any) {
        // 跳过这些元素内的文本
      },
    })
    // 处理所有其他元素
    .on('*', {
      element(element: any) {
        // 进入其他元素时重置跳过标志
        if (!['script', 'style', 'noscript', 'iframe', 'object', 'embed'].includes(element.tagName)) {
          skipContent = false;
        }
      },
      text(input: any) {
        // 如果不需要跳过，添加文本
        if (!skipContent) {
          text += input.text;
        }
      },
    })
    .transform(new Response(html));

  await rewriter.text();
  return text.trim();
}

/**
 * 将 HTML 转换为 Markdown
 */
function convertHTMLToMarkdown(html: string): string {
  // 创建 TurndownService 实例
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  // 移除不需要的标签
  turndownService.remove(['script', 'style', 'meta', 'link']);

  // 转换 HTML 为 Markdown
  return turndownService.turndown(html);
}
