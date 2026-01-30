/**
 * LSP Tool - Language Server Protocol Tools
 *
 * 使用 TypeScript Compiler API 实现代码智能功能。
 * 支持 TypeScript/JavaScript 文件的代码导航和分析。
 */

import { z } from 'zod';
import { BaseTool, ToolResult } from './base';
import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 支持的 LSP 操作
 */
const LSP_OPERATIONS = [
  'goToDefinition',
  'findReferences',
  'hover',
  'documentSymbol',
  'workspaceSymbol',
] as const;

type LspOperation = typeof LSP_OPERATIONS[number];

/**
 * LSP 工具类
 */
export class LspTool extends BaseTool<
  z.ZodObject<{
    operation: z.ZodEnum<[LspOperation, ...LspOperation[]]>;
    filePath: z.ZodString;
    line: z.ZodNumber;
    character: z.ZodNumber;
  }>
> {
  name = 'lsp';
  description = `Language Server Protocol tool for TypeScript/JavaScript code intelligence.

Supported operations:
- goToDefinition: Find where a symbol is defined
- findReferences: Find all references to a symbol
- hover: Get type information and documentation for a symbol
- documentSymbol: Get all symbols (functions, classes, variables) in a document
- workspaceSymbol: Search for symbols across the entire workspace

All operations require:
- filePath: The file to operate on (absolute or relative path)
- line: The line number (1-based, as shown in editors)
- character: The character offset (1-based, as shown in editors)

Note: This tool currently supports TypeScript/JavaScript files (.ts, .tsx, .js, .jsx).`;

  schema = z.object({
    operation: z.enum(LSP_OPERATIONS).describe('The LSP operation to perform'),
    filePath: z.string().describe('The absolute or relative path to the file'),
    line: z.number().int().min(1).describe('The line number (1-based, as shown in editors)'),
    character: z.number().int().min(1).describe('The character offset (1-based, as shown in editors)'),
  });

  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  /**
   * 初始化 TypeScript 编译器
   */
  private async initTypeScript(rootDir: string): Promise<void> {
    if (this.program) return;

    const tsConfigPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');
    const compilerOptions: ts.CompilerOptions = {};

    if (tsConfigPath) {
      const { config } = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
      const { options } = ts.parseJsonConfigFileContent(config, ts.sys, rootDir);
      Object.assign(compilerOptions, options);
    } else {
      // 默认配置
      compilerOptions.target = ts.ScriptTarget.Latest;
      compilerOptions.module = ts.ModuleKind.CommonJS;
      compilerOptions.moduleResolution = ts.ModuleResolutionKind.NodeJs;
      compilerOptions.strict = true;
      compilerOptions.esModuleInterop = true;
      compilerOptions.skipLibCheck = true;
      compilerOptions.allowJs = true;
      compilerOptions.checkJs = true;
    }

    // 收集所有源文件
    const allFiles = await this.collectSourceFiles(rootDir);

    this.program = ts.createProgram(allFiles, compilerOptions);
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 收集所有 TypeScript/JavaScript 源文件
   */
  private async collectSourceFiles(rootDir: string): Promise<string[]> {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // 跳过 node_modules
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (extensions.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    };

    await walk(rootDir);
    return files;
  }

  /**
   * 获取源文件
   */
  private async getSourceFile(filePath: string): Promise<ts.SourceFile | null> {
    // 检查缓存
    if (this.sourceFiles.has(filePath)) {
      return this.sourceFiles.get(filePath)!;
    }

    if (!this.program) {
      return null;
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (sourceFile) {
      this.sourceFiles.set(filePath, sourceFile);
    }

    return sourceFile || null;
  }

  /**
   * 获取指定位置的节点
   */
  private getNodeAtPosition(
    sourceFile: ts.SourceFile,
    line: number,
    character: number
  ): ts.Node | null {
    const pos = ts.getPositionOfLineAndCharacter(sourceFile, line, character);
    let node: ts.Node | undefined = sourceFile;

    while (node) {
      const child = node.getChildAt(pos, sourceFile);
      if (child === node || !child) {
        return node;
      }
      node = child;
    }

    return null;
  }

  /**
   * 获取位置的类型信息
   */
  private getTypeInfo(
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): { type: string; documentation: string } | null {
    if (!this.typeChecker) return null;

    try {
      const type = this.typeChecker.getTypeAtLocation(node);
      const typeName = this.typeChecker.typeToString(type);
      const symbol = type.getSymbol();
      const documentation = symbol
        ? ts.displayPartsToString(symbol.getDocumentationComment(this.typeChecker))
        : '';

      return { type: typeName, documentation };
    } catch {
      return null;
    }
  }

  /**
   * 跳转到定义
   */
  private async goToDefinition(
    filePath: string,
    line: number,
    character: number
  ): Promise<ToolResult> {
    const sourceFile = await this.getSourceFile(filePath);
    if (!sourceFile) {
      return this.fail(`Source file not found: ${filePath}`);
    }

    const node = this.getNodeAtPosition(sourceFile, line - 1, character - 1);
    if (!node) {
      return this.fail('No node found at the specified position');
    }

    if (!this.typeChecker) {
      return this.fail('TypeScript compiler not initialized');
    }

    const symbol = this.typeChecker.getSymbolAtLocation(node);
    if (!symbol) {
      return this.success({ message: 'No definition found' });
    }

    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      return this.success({ message: 'No definition found' });
    }

    const results = declarations.map((decl) => {
      const declSourceFile = decl.getSourceFile();
      if (!declSourceFile) return null;

      const defStart = decl.getStart(declSourceFile);
      const { line: defLine, character: defCharacter } =
        declSourceFile.getLineAndCharacterOfPosition(defStart);

      return {
        filePath: declSourceFile.fileName,
        line: defLine + 1,
        character: defCharacter + 1,
        name: symbol.getName(),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    return this.success({
      operation: 'goToDefinition',
      position: { filePath, line, character },
      definitions: results,
    });
  }

  /**
   * 查找引用
   */
  private async findReferences(
    filePath: string,
    line: number,
    character: number
  ): Promise<ToolResult> {
    const sourceFile = await this.getSourceFile(filePath);
    if (!sourceFile) {
      return this.fail(`Source file not found: ${filePath}`);
    }

    const node = this.getNodeAtPosition(sourceFile, line - 1, character - 1);
    if (!node) {
      return this.fail('No node found at the specified position');
    }

    if (!this.typeChecker) {
      return this.fail('TypeScript compiler not initialized');
    }

    const symbol = this.typeChecker.getSymbolAtLocation(node);
    if (!symbol) {
      return this.fail('No symbol found at the specified position');
    }

    const references: Array<{
      filePath: string;
      line: number;
      character: number;
      isDefinition: boolean;
    }> = [];

    // 添加定义位置
    const declarations = symbol.getDeclarations();
    for (const decl of declarations!) {
      const declSourceFile = decl.getSourceFile();
      if (!declSourceFile) continue;

      const { line: defLine, character: defCharacter } =
        declSourceFile.getLineAndCharacterOfPosition(decl.getStart(declSourceFile));

      references.push({
        filePath: declSourceFile.fileName,
        line: defLine + 1,
        character: defCharacter + 1,
        isDefinition: true,
      });
    }

    // 在所有源文件中查找引用（简化实现，使用文本匹配）
    const nodeText = node.getText();
    const program = this.program!;
    const allSourceFiles = program.getSourceFiles();

    for (const file of allSourceFiles) {
      // 如果已经添加了定义，跳过
      if (declarations?.some((d) => d.getSourceFile()?.fileName === file.fileName)) {
        continue;
      }

      const fileContent = file.getFullText();
      const regex = new RegExp(
        `\\b${nodeText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'g'
      );

      let match;
      const seenPositions = new Set<number>();
      while ((match = regex.exec(fileContent)) !== null) {
        const { line: refLine, character: refCharacter } =
          file.getLineAndCharacterOfPosition(match.index);

        const posKey = refLine * 1000 + refCharacter;
        if (!seenPositions.has(posKey)) {
          seenPositions.add(posKey);
          references.push({
            filePath: file.fileName,
            line: refLine + 1,
            character: refCharacter + 1,
            isDefinition: false,
          });
        }
      }
    }

    // 限制结果数量
    const maxReferences = 50;
    const limitedReferences = references.slice(0, maxReferences);

    if (limitedReferences.length === 0) {
      return this.success({ message: 'No references found' });
    }

    return this.success({
      operation: 'findReferences',
      position: { filePath, line, character },
      symbol: symbol.getName(),
      references: limitedReferences,
    });
  }

  /**
   * 获取悬停信息
   */
  private async hover(
    filePath: string,
    line: number,
    character: number
  ): Promise<ToolResult> {
    const sourceFile = await this.getSourceFile(filePath);
    if (!sourceFile) {
      return this.fail(`Source file not found: ${filePath}`);
    }

    const node = this.getNodeAtPosition(sourceFile, line - 1, character - 1);
    if (!node) {
      return this.fail('No node found at the specified position');
    }

    const typeInfo = this.getTypeInfo(node, sourceFile);
    if (!typeInfo) {
      return this.success({ message: 'No type information available' });
    }

    return this.success({
      operation: 'hover',
      position: { filePath, line, character },
      type: typeInfo.type,
      documentation: typeInfo.documentation,
    });
  }

  /**
   * 获取文档符号
   */
  private async documentSymbol(filePath: string): Promise<ToolResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest);

    const symbols: Array<{
      name: string;
      kind: string;
      line: number;
      character: number;
    }> = [];

    const visitNode = (node: ts.Node): void => {
      if (!node) return;

      const kind = node.kind;
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );

      if (
        kind === ts.SyntaxKind.FunctionDeclaration ||
        kind === ts.SyntaxKind.ClassDeclaration ||
        kind === ts.SyntaxKind.InterfaceDeclaration ||
        kind === ts.SyntaxKind.TypeAliasDeclaration ||
        kind === ts.SyntaxKind.VariableStatement ||
        kind === ts.SyntaxKind.ArrowFunction ||
        kind === ts.SyntaxKind.MethodDeclaration
      ) {
        let name = 'anonymous';

        try {
          if (ts.isFunctionDeclaration(node) && node.name) {
            name = node.name.getText(sourceFile);
          } else if (ts.isClassDeclaration(node) && node.name) {
            name = node.name.getText(sourceFile);
          } else if (ts.isInterfaceDeclaration(node) && node.name) {
            name = node.name.getText(sourceFile);
          } else if (ts.isTypeAliasDeclaration(node) && node.name) {
            name = node.name.getText(sourceFile);
          } else if (ts.isVariableStatement(node)) {
            name = node.declarationList?.declarations?.[0]?.name?.getText(sourceFile) || 'anonymous';
          } else if (ts.isMethodDeclaration(node) && node.name) {
            name = node.name.getText(sourceFile);
          }
        } catch {
          // 忽略无法提取名称的节点
        }

        symbols.push({
          name,
          kind: ts.SyntaxKind[kind],
          line: line + 1,
          character: character + 1,
        });
      }

      // 递归访问子节点
      ts.forEachChild(node, visitNode);
    };

    visitNode(sourceFile);

    return this.success({
      operation: 'documentSymbol',
      filePath,
      symbols,
    });
  }

  /**
   * 工作区符号（简化版）
   */
  private async workspaceSymbol(filePath: string): Promise<ToolResult> {
    const rootDir = path.dirname(filePath);
    const sourceFiles = await this.collectSourceFiles(rootDir);

    const symbols: Array<{
      name: string;
      kind: string;
      filePath: string;
      line: number;
      character: number;
    }> = [];

    // 限制文件数量以避免性能问题
    const maxFiles = Math.min(sourceFiles.length, 100);

    for (let i = 0; i < maxFiles; i++) {
      const file = sourceFiles[i];
      try {
        const content = await fs.readFile(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest);

        const visitNode = (node: ts.Node): void => {
          if (!node) return;

          const kind = node.kind;
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile)
          );

          if (
            kind === ts.SyntaxKind.FunctionDeclaration ||
            kind === ts.SyntaxKind.ClassDeclaration ||
            kind === ts.SyntaxKind.InterfaceDeclaration ||
            kind === ts.SyntaxKind.TypeAliasDeclaration
          ) {
            let name = 'anonymous';

            try {
              if (ts.isFunctionDeclaration(node) && node.name) {
                name = node.name.getText(sourceFile);
              } else if (ts.isClassDeclaration(node) && node.name) {
                name = node.name.getText(sourceFile);
              } else if (ts.isInterfaceDeclaration(node) && node.name) {
                name = node.name.getText(sourceFile);
              } else if (ts.isTypeAliasDeclaration(node) && node.name) {
                name = node.name.getText(sourceFile);
              }
            } catch {
              // 忽略无法提取名称的节点
            }

            symbols.push({
              name,
              kind: ts.SyntaxKind[kind],
              filePath: file,
              line: line + 1,
              character: character + 1,
            });
          }

          ts.forEachChild(node, visitNode);
        };

        visitNode(sourceFile);
      } catch {
        // 忽略无法解析的文件
      }
    }

    // 限制结果数量
    const maxResults = 50;
    const limitedSymbols = symbols.slice(0, maxResults);

    return this.success({
      operation: 'workspaceSymbol',
      totalFound: symbols.length,
      symbols: limitedSymbols,
    });
  }

  /**
   * 执行 LSP 操作
   */
  async execute(
    args: z.infer<typeof this.schema>
  ): Promise<ToolResult> {
    try {
      // 解析文件路径
      const absolutePath = path.isAbsolute(args.filePath)
        ? args.filePath
        : path.resolve(process.cwd(), args.filePath);

      // 检查文件是否存在
      try {
        await fs.access(absolutePath);
      } catch {
        return this.fail(`File not found: ${absolutePath}`);
      }

      // 检查文件类型
      const ext = path.extname(absolutePath);
      const supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
      if (!supportedExtensions.includes(ext)) {
        return this.fail(
          `Unsupported file type: ${ext}. Supported types: ${supportedExtensions.join(', ')}`
        );
      }

      // 初始化 TypeScript 编译器
      const rootDir = path.dirname(absolutePath);
      await this.initTypeScript(rootDir);

      // 根据操作类型执行相应功能
      switch (args.operation) {
        case 'goToDefinition':
          return this.goToDefinition(absolutePath, args.line, args.character);

        case 'findReferences':
          return this.findReferences(absolutePath, args.line, args.character);

        case 'hover':
          return this.hover(absolutePath, args.line, args.character);

        case 'documentSymbol':
          return this.documentSymbol(absolutePath);

        case 'workspaceSymbol':
          return this.workspaceSymbol(absolutePath);

        default:
          return this.fail(`Unknown operation: ${args.operation}`);
      }
    } catch (error) {
      return this.fail(
        `LSP operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export default LspTool;
