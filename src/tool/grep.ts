import { spawn } from 'node:child_process';
import * as readline from 'node:readline';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { BaseTool, ToolOutput } from './base';

/**
 * 获取 ripgrep 二进制路径（使用 @vscode/ripgrep）
 */
async function getRgBinary(): Promise<string> {
  const vscodeRg = require('@vscode/ripgrep');
  return vscodeRg.rgPath;
}

const schema = z.object({
  pattern: z.string().min(1).describe('Regex pattern (ripgrep syntax). Example: "log.*Error", "function\\s+\\w+"'),
  filePattern: z.string().nullable().optional().default(null).describe('Glob include filter. Example: "*.ts", "*.{ts,tsx}"'),
  path: z.string().nullable().optional().default(null).describe('Search root (directory or file). Example: "src", "src/tool/grep.ts"'),

  // —— 可选：给 LLM 更强可控性（不传也行）——
  maxResults: z.number().int().min(1).max(2000).optional().default(200)
    .describe('Max total match events kept (default 200)'),
  maxMatchesPerFile: z.number().int().min(1).max(50).optional().default(3)
    .describe('Max matches kept per file (default 3)'),
  timeoutMs: z.number().int().min(100).max(60000).optional().default(5000)
    .describe('Kill rg after timeout (default 5000ms)'),
  maxFilesize: z.string().optional().default('2M')
    .describe('Skip files larger than this (default "2M")'),

  caseMode: z.enum(['smart', 'sensitive', 'insensitive']).optional().default('smart')
    .describe('Case mode: smart/sensitive/insensitive (default smart)'),
  word: z.boolean().optional().default(false).describe('Match whole words only'),
  multiline: z.boolean().optional().default(false).describe('Enable multiline mode (-U/--multiline)'),
  pcre2: z.boolean().optional().default(false).describe('Use PCRE2 engine (--pcre2) if supported'),

  includeHidden: z.boolean().optional().default(false).describe('Search hidden files/directories (--hidden)'),
  noIgnore: z.boolean().optional().default(false).describe('Do not respect .gitignore/.ignore (--no-ignore)'),
});

type Input = z.infer<typeof schema>;

type GrepMatch = {
  line: number | null;
  column: number | null; // best-effort: computed from submatch start + 1
  content: string;       // matched line(s)
  matchText?: string;    // first submatch text (if available)
  start?: number;        // byte offset in line text (ripgrep reports offsets; see rg json spec)
  end?: number;
};

type GrepFileResult = {
  file: string;              // normalized path (posix style)
  mtimeMs: number | null;
  mtimeIso: string | null;
  matches: GrepMatch[];
};

function toDisplayString(arbitrary: any): string {
  // ripgrep JSON uses {text} for valid UTF-8, otherwise {bytes: base64}. :contentReference[oaicite:6]{index=6}
  if (!arbitrary) return '';
  if (typeof arbitrary.text === 'string') return arbitrary.text;
  if (typeof arbitrary.bytes === 'string') {
    // best-effort decode; may be lossy if original bytes aren't UTF-8
    try {
      return Buffer.from(arbitrary.bytes, 'base64').toString('utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeFilePath(cwd: string, p: string): string {
  // rg may emit absolute paths; normalize to relative if possible, and convert to posix slashes.
  const rel = path.isAbsolute(p) ? path.relative(cwd, p) : p;
  return rel.split(path.sep).join('/');
}

export default class GrepTool extends BaseTool<typeof schema> {
  name = 'grep';

  description = `- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions (ripgrep)
- Supports include filter via filePattern (glob)
- Optional search root via path parameter
- Returns file paths and line numbers with at least one match, sorted by modification time
- Safe for LLM usage: capped results + timeout + ignores heavy dirs
- Use this tool to find where something appears; for exact counting, use rg directly in Bash
`;

  schema = schema;

  async execute(raw: unknown): Promise<ToolOutput> {
    const input: Input = schema.parse(raw);
    const {
      pattern,
      filePattern,
      maxResults,
      maxMatchesPerFile,
      timeoutMs,
      maxFilesize,
      caseMode,
      word,
      multiline,
      pcre2,
      includeHidden,
  noIgnore,
  path: searchRoot,
    } = input;

    // 基础排除规则（始终生效）
    const ignoreGlobs = [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/*.min.js',
      '**/*.min.css',
      '**/coverage/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/build/**',
    ];

    const cwd = process.cwd();
    const startedAt = Date.now();

    // 获取 ripgrep 二进制路径（使用 @vscode/ripgrep）
    const rgBin = await getRgBinary();

    // 构建 rg 参数
    const args: string[] = [];

    // 机器可解析输出（JSON Lines：begin/end/match/context） :contentReference[oaicite:7]{index=7}
    args.push('--json');

    // 降噪：权限等信息不要混 stdout（stderr 仍可抓到）
    args.push('--no-messages');

    // 限制文件大小，避免扫超大文件拖死（LLM 工具必备）
    if (maxFilesize) {
      args.push('--max-filesize', String(maxFilesize));
    }

    // 文件过滤：include glob（比你现在的 minimatch 事后过滤快很多） :contentReference[oaicite:8]{index=8}
    if (filePattern) {
      args.push('--glob', filePattern);
    }

    // 文件过滤：exclude globs
    for (const g of ignoreGlobs) {
      args.push('--glob', `!${g}`);
    }

    // 默认 ripgrep 会遵循 .gitignore，并跳过 hidden/binary；可选打开 :contentReference[oaicite:9]{index=9}
    if (includeHidden) args.push('--hidden');
    if (noIgnore) args.push('--no-ignore');

    // 大小写策略
    if (caseMode === 'smart') args.push('--smart-case');
    else if (caseMode === 'insensitive') args.push('--ignore-case');
    else args.push('--case-sensitive');

    if (word) args.push('--word-regexp');
    if (multiline) args.push('--multiline');
    if (pcre2) args.push('--pcre2');

    const resolvedSearchRoot = searchRoot ? path.resolve(cwd, searchRoot) : '.';

    // 重要：加 `--` 防止 pattern 以 `-` 开头被当成参数
    args.push('--', pattern, resolvedSearchRoot);

    // 执行 + 解析
    const fileMap = new Map<string, { matches: GrepMatch[] }>();
    let totalMatchesKept = 0;
    let truncated = false;
    let timedOut = false;
    let stderr = '';

    try {
      const child = spawn(rgBin, args, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (d) => (stderr += d));

      const rl = readline.createInterface({
        input: child.stdout,
        crlfDelay: Infinity,
      });

      const kill = () => {
        try {
          if (!child.killed) child.kill('SIGKILL');
        } catch {}
      };

      const timer = setTimeout(() => {
        timedOut = true;
        truncated = true;
        kill();
        rl.close();
      }, timeoutMs);

      // 逐行解析 JSON
      // JSON envelope: { type: "...", data: {...} } :contentReference[oaicite:10]{index=10}
      for await (const line of rl) {
        if (!line) continue;

        let evt: any;
        try {
          evt = JSON.parse(line);
        } catch {
          continue;
        }

        if (evt?.type !== 'match') continue;

        const fileRaw = toDisplayString(evt?.data?.path);
        if (!fileRaw) continue;

        const file = normalizeFilePath(cwd, fileRaw);

        // 结果数上限（LLM 防 token 爆炸）
        if (totalMatchesKept >= maxResults) {
          truncated = true;
          kill();
          rl.close();
          break;
        }

        const entry = fileMap.get(file) ?? { matches: [] };

        // 每个文件最多保留 N 条（默认 3）
        if (entry.matches.length < maxMatchesPerFile) {
          const linesText = toDisplayString(evt?.data?.lines) || '';
          const content = linesText.replace(/\r?\n$/g, '');

          const sub = Array.isArray(evt?.data?.submatches) ? evt.data.submatches : [];
          const first = sub[0];
          const matchText = first?.match ? toDisplayString(first.match) : undefined;
          const start = typeof first?.start === 'number' ? first.start : undefined;
          const end = typeof first?.end === 'number' ? first.end : undefined;

          // docs.rs 示例中 start/end 是偏移；列号一般可视为 start+1（偏移按字节计算） :contentReference[oaicite:11]{index=11}
          const column = typeof start === 'number' ? start + 1 : null;

          entry.matches.push({
            line: typeof evt?.data?.line_number === 'number' ? evt.data.line_number : null,
            column,
            content: content.trimEnd(),
            matchText,
            start,
            end,
          });

          fileMap.set(file, entry);
          totalMatchesKept += 1;
        }
      }

      const exitCode: number = await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', resolve);
      });
      clearTimeout(timer);

      // exit code: 0=found, 1=not found, 2=error :contentReference[oaicite:12]{index=12}
      if (exitCode === 1 && fileMap.size === 0 && !timedOut) {
        return {
          metadata: { ok: true, countFiles: 0, countMatches: 0, truncated: false, tookMs: Date.now() - startedAt },
          output: 'No matches found',
        };
      }

      if (exitCode === 2 && !timedOut) {
        return {
          metadata: {
            ok: false,
            error: (stderr || 'ripgrep exited with code 2').trim(),
            exitCode,
            tookMs: Date.now() - startedAt,
          },
          output: (stderr || 'ripgrep exited with code 2').trim(),
        };
      }

      // 按 mtime 排序（只对命中文件做 stat；数量被你上限控制住）
      const results: GrepFileResult[] = await Promise.all(
        Array.from(fileMap.entries()).map(async ([file, v]) => {
          const abs = path.isAbsolute(file) ? file : path.resolve(cwd, file);
          let mtimeMs: number | null = null;
          try {
            const st = await fs.stat(abs);
            mtimeMs = st.mtimeMs;
          } catch {
            mtimeMs = null;
          }
          return {
            file,
            mtimeMs,
            mtimeIso: mtimeMs ? new Date(mtimeMs).toISOString() : null,
            matches: v.matches,
          };
        })
      );

      results.sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0));

      return {
        metadata: {
          ok: true,
          countFiles: results.length,
          countMatches: totalMatchesKept,
          truncated,
          timedOut,
          tookMs: Date.now() - startedAt,
          // 方便你调试：把实际 rg args 带出去（可选）
          rg: { bin: rgBin, args },
          result: results,
        },
        output: JSON.stringify(results, null, 2),
      };
    } catch (error: any) {
      return {
        metadata: {
          ok: false,
          error: error?.message || String(error),
          stderr: (stderr || '').trim() || undefined,
          tookMs: Date.now() - startedAt,
        },
        output: error?.message || String(error),
      };
    }
  }
}
