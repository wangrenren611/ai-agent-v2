import Parser from 'tree-sitter';
// @ts-ignore
import TypeScript from 'tree-sitter-typescript';
import * as fs from 'fs';
import * as path from 'path';

export class CodeCompressor {
  private parser: Parser;
  private language: Parser.Language;

  constructor() {
    this.parser = new Parser();
    this.language = TypeScript.typescript as unknown as Parser.Language;
    this.parser.setLanguage(this.language);
  }

  /**
   * 将源代码压缩为骨架结构
   */
  public compress(code: string): string {
    const tree = this.parser.parse(code);
    const lines = code.split('\n');
    const result: string[] = [];

    // 记录所有需要保留的行号
    const keepLines = new Set<number>();
    const keepNodeTypes = new Set([
      'class_declaration',
      'abstract_class_declaration',
      'interface_declaration',
      'function_declaration',
      'method_definition',
      'method_signature',
      'abstract_method_signature',
    ]);

    const visit = (node: Parser.SyntaxNode) => {
      if (keepNodeTypes.has(node.type)) {
        keepLines.add(node.startPosition.row);
      }
      for (const child of node.children) {
        visit(child);
      }
    };
    visit(tree.rootNode);

    // 遍历代码，重构压缩后的版本
    for (let i = 0; i < lines.length; i++) {
      if (keepLines.has(i)) {
        const trimmed = lines[i].trim();
        // 如果是类或函数定义，把末尾的 "{" 换成 " { ... }" 表示隐藏了内容
        const compressedLine = trimmed.replace(/\{?$/, " { ... }");
        result.push("  ".repeat(this.getIndent(lines[i])) + compressedLine);
      } else if (lines[i].includes('import ') || lines[i].includes('export ')) {
        // 保留导入导出关系，这对建立依赖图至关重要
        result.push(lines[i]);
      }
    }

    return result.join('\n');
  }

  private getIndent(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? Math.floor(match[0].length / 2) : 0;
  }
}


async function generateProjectMap(dir: string, compressor: CodeCompressor) {
  const files = fs.readdirSync(dir, { recursive: true }) as string[];
  let projectMap = "";

  for (const file of files) {
    const filePath = path.join(dir, file);
    // 只处理 ts/js 文件，忽略 node_modules 和 git
    if (file.endsWith('.ts') && !filePath.includes('node_modules')) {
      const code = fs.readFileSync(filePath, 'utf-8');
      const compressed = compressor.compress(code);
      
      projectMap += `\n--- File: ${file} ---\n`;
      projectMap += compressed + "\n";
    }
  }
  return projectMap;
}


(async ()=>{
fs.writeFileSync('./projectMap.md', await generateProjectMap('./src', new CodeCompressor()));
})()
