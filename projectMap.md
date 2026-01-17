
--- File: codeCompressor.ts ---
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import * as fs from 'fs';
import * as path from 'path';
export class CodeCompressor  { ... }
  constructor()  { ... }
  public compress(code: string): string  { ... }
      } else if (lines[i].includes('import ') || lines[i].includes('export ')) {
  private getIndent(line: string): number  { ... }
async function generateProjectMap(dir: string, compressor: CodeCompressor)  { ... }

--- File: index.ts ---
import dotenv from 'dotenv';
import { OpenAIProvider } from './providers/openai';
import Agent from './agent';
import { connectDB } from './storage/mongoose';
import { SessionManager } from './application/SessionManager';
import { MessageRepository } from './infrastructure/MessageRepository';
import { CLI } from './cli';
import { registerDefaultToolsAsync } from './tool';
interface AppConfig  { ... }
async function initializeApp(config: AppConfig)  { ... }
async function startCLI(agent: Agent, sessionId?: string): Promise<void>  { ... }
async function runDemo(agent: Agent): Promise<void>  { ... }
async function main()  { ... }

--- File: agent/index.ts ---
import EventEmitter from "events";
import { LLMProvider, message, ToolSchema } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { formatToolResult } from "../util/log-format";
import { SessionManager } from "../application/SessionManager";
import { SYSTEM_PROMPT } from "../prompts/system";
import { ToolRegistry } from "../tool";
import { Compaction } from "../session/compaction";
export interface AgentConfig  { ... }
export interface AgentResponse  { ... }
export default class Agent extends EventEmitter  { ... }
    constructor(config: AgentConfig)  { ... }
    async run( { ... }
    async getHistory(sessionId: string): Promise<message[]>  { ... }
    async loadHistory(sessionId: string): Promise<void>  { ... }
    async clearSession(sessionId: string): Promise<void>  { ... }

--- File: application/SessionManager.ts ---
import { MessageQueue } from "../domain/MessageQueue";
import { Session, createSession } from "../domain/session";
import { message } from "../providers/base";
import { MessageRepository } from "../infrastructure/MessageRepository";
import { ScopedLogger } from "../util/log";
export class SessionManager  { ... }
    constructor(repository: MessageRepository)  { ... }
    createSession(userId: string): Session  { ... }
    getSession(sessionId: string): Session | undefined  { ... }
    getOrCreateSession(sessionId: string, userId: string): Session  { ... }
    getQueue(sessionId: string): MessageQueue  { ... }
    async addMessage(sessionId: string, userId: string, msg: message): Promise<void>  { ... }
    async getMessages(sessionId: string): Promise<message[]>  { ... }
    getMessagesFromMemory(sessionId: string): message[]  { ... }
    async loadHistory(sessionId: string): Promise<void>  { ... }
    async deleteSession(sessionId: string): Promise<void>  { ... }
    getActiveSessions(): Session[]  { ... }

--- File: cli/CLI.ts ---
import { ScopedLogger } from '../util/log';
import Agent from '../agent';
import { executeCommand } from './commands';
import { formatSessionId, InputHistory } from './utils';
import { readWithHistory } from './utils/reader';
import type { CommandContext } from './commands/types';
export interface CLIConfig  { ... }
export class CLI  { ... }
    constructor(config: CLIConfig)  { ... }
    async start(): Promise<void>  { ... }
    private async getInput(): Promise<string>  { ... }
    private async handleInput(input: string): Promise<void>  { ... }
    private async handleChat(input: string): Promise<void>  { ... }
    private printWelcome(): void  { ... }
    private shutdown(): void  { ... }
    stop(): void  { ... }

--- File: cli/index.ts ---
export { CLI } from './CLI';
export type { CLIConfig } from './CLI';

--- File: domain/MessageQueue.ts ---
import { message } from "../providers/base";
export class MessageQueue  { ... }
    add(msg: message): void  { ... }
    getAll(): message[]  { ... }
    size(): number  { ... }
    clear(): void  { ... }
    getRecent(count: number): message[]  { ... }

--- File: domain/session.ts ---
export interface Session  { ... }
export function createSession(userId: string): Session  { ... }
function generateSessionId(): string  { ... }

--- File: examples/log-demo.ts ---
import Log from '../util/log';
async function main()  { ... }

--- File: infrastructure/MessageRepository.ts ---
import { message } from "../providers/base";
import { Message } from "../storage/models/message";
import { ScopedLogger } from "../util/log";
export class MessageRepository  { ... }
    constructor()  { ... }
    async save(sessionId: string, userId: string, msg: message): Promise<void>  { ... }
    async saveBatch(sessionId: string, userId: string, messages: message[]): Promise<void>  { ... }
    async findBySession(sessionId: string): Promise<message[]>  { ... }
    async deleteBySession(sessionId: string): Promise<void>  { ... }

--- File: mcp/client.ts ---
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type {
import { ConnectionState, Tool, ToolCallResponse } from './types';
export class McpClient extends EventEmitter  { ... }
  constructor(config: McpServerConfig)  { ... }
  async connect(): Promise<void>  { ... }
  async disconnect(): Promise<void>  { ... }
  private async initialize(): Promise<InitializeResult>  { ... }
  async listTools(cursor?: string): Promise<ToolsListResponse>  { ... }
  async callTool(request: ToolCallRequest): Promise<ToolCallResponse>  { ... }
  getTools(): Tool[]  { ... }
  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse>  { ... }
  private sendMessage(message: JsonRpcRequest): void  { ... }
  private handleMessage(data: string): void  { ... }
  private handleResponse(response: JsonRpcResponse): void  { ... }
  private handleNotification(notification: JsonRpcNotification): void  { ... }
  private rejectAllPendingRequests(error: Error): void  { ... }
  private setState(state: ConnectionState): void  { ... }
  get state(): ConnectionState  { ... }
  get serverName(): string  { ... }
export { ConnectionState, Tool };

--- File: mcp/config-loader.ts ---
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { McpServerConfig } from './types';
export interface McpConfigFile  { ... }
export async function loadMcpConfig(configPath?: string): Promise<McpConfigFile>  { ... }
function findConfigFile(): string | undefined  { ... }
function normalizeConfig(rawConfig: any): McpConfigFile  { ... }
function normalizeServerConfig(config: any): McpServerConfig  { ... }
function resolveEnvVars(env: Record<string, string>): Record<string, string>  { ... }
export function getEnvValue(value: string): string  { ... }
export { findConfigFile, normalizeConfig, normalizeServerConfig };

--- File: mcp/index.ts ---
export * from './types';
export * from './client';
export * from './tool-adapter';
export * from './manager';
export * from './config-loader';
export * from './json-schema-to-zod';
export { initializeMcp, getMcpManager } from './manager';
export { loadMcpConfig, findConfigFile } from './config-loader';
export { McpClient, ConnectionState } from './client';
export { McpToolAdapter, createToolAdapters } from './tool-adapter';
export { jsonSchemaToZod } from './json-schema-to-zod';
export type {
export type { McpConfigFile as ConfigFile } from './config-loader';

--- File: mcp/json-schema-to-zod.ts ---
import { z } from 'zod';
export function jsonSchemaToZod(jsonSchema: Record<string, unknown>): z.ZodType<any>  { ... }
function convertSchema(schema: Record<string, unknown>): z.ZodTypeAny  { ... }
function convertObjectSchema(schema: Record<string, unknown>): z.ZodTypeAny  { ... }
function convertArraySchema(schema: Record<string, unknown>): z.ZodTypeAny  { ... }
function convertStringSchema(schema: Record<string, unknown>): z.ZodTypeAny  { ... }
function convertNumberSchema(schema: Record<string, unknown>): z.ZodNumber  { ... }

--- File: mcp/manager.ts ---
import { McpClient } from './client';
import { createToolAdapters } from './tool-adapter';
import { ToolRegistry } from '../tool/index';
import { loadMcpConfig } from './config-loader';
import type { McpServerConfig,  McpConnectionInfo } from './types';
import { ConnectionState } from './types';
export class McpManager  { ... }
  private constructor() {} { ... }
  static getInstance(): McpManager  { ... }
  async loadAndConnect(configPath?: string): Promise<void>  { ... }
  async connectServer(config: McpServerConfig): Promise<void>  { ... }
  async disconnectServer(serverName: string): Promise<void>  { ... }
  async disconnectAll(): Promise<void>  { ... }
  private async refreshServerTools(serverName: string): Promise<void>  { ... }
  getConnectionInfo(): McpConnectionInfo[]  { ... }
  getServerInfo(serverName: string): McpConnectionInfo | undefined  { ... }
  getConnectedServers(): string[]  { ... }
  getTotalToolsCount(): number  { ... }
  private updateConnectionInfo( { ... }
export async function initializeMcp(configPath?: string): Promise<McpManager>  { ... }
export function getMcpManager(): McpManager  { ... }

--- File: mcp/tool-adapter.ts ---
import { z } from 'zod';
import { BaseTool } from '../tool/base';
import type { McpClient, Tool as McpTool } from './client';
import { ToolCallResponse } from './types';
import { jsonSchemaToZod } from './json-schema-to-zod';
export class McpToolAdapter extends BaseTool<z.ZodType<any>>  { ... }
  constructor(client: McpClient, toolDefinition: McpTool, serverName: string)  { ... }
  get name(): string  { ... }
  private sanitizeName(name: string): string  { ... }
  get description(): string  { ... }
  async execute(args: z.infer<typeof this.schema>): Promise<string>  { ... }
  private formatToolResponse(response: ToolCallResponse): string  { ... }
  private extractTextContent(response: ToolCallResponse): string  { ... }
export function createToolAdapters( { ... }

--- File: mcp/types.ts ---
export interface JsonRpcRequest  { ... }
export interface JsonRpcResponse  { ... }
export interface JsonRpcError  { ... }
export interface JsonRpcNotification  { ... }
export interface InitializeParams  { ... }
export interface ClientCapabilities  { ... }
export interface ClientInfo  { ... }
export interface InitializeResult  { ... }
export interface ServerCapabilities  { ... }
export interface ServerInfo  { ... }
export interface ToolsListRequest  { ... }
export interface ToolsListResponse  { ... }
export interface Tool  { ... }
export interface ToolIcon  { ... }
export type JsonSchema = Record<string, unknown>;
export interface ToolCallRequest  { ... }
export interface ToolCallResponse  { ... }
export type ToolContent =
export interface TextContent  { ... }
export interface ImageContent  { ... }
export interface ResourceLinkContent  { ... }
export interface EmbeddedResourceContent  { ... }
export interface ToolsListChangedNotification  { ... }
export interface McpServerConfig  { ... }
export enum ConnectionState {
export interface McpConnectionInfo  { ... }

--- File: prompts/system.ts ---
export const SYSTEM_PROMPT = `

--- File: providers/base.ts ---
export interface ProviderConfig  { ... }
export interface ToolSchema  { ... }
export interface LLMOptions  { ... }
export type message = {
export type LLMResponse = {
export abstract class LLMProvider { ... }
  protected constructor( { ... }
  abstract generate(messages: message[], options?: LLMOptions): Promise<LLMResponse|null> { ... }

--- File: providers/openai.ts ---
import { LLMProvider, LLMOptions, LLMResponse, message, ToolSchema, type ProviderConfig } from './base'
function fixMalformedJson(potentiallyMalformedJson: string): string  { ... }
function fixUnescapedNewlinesInStrings(json: string): string  { ... }
export interface OpenAIConfig extends ProviderConfig  { ... }
interface ChatCompletionResponse  { ... }
export class OpenAIProvider extends LLMProvider  { ... }
  constructor(config: OpenAIConfig)  { ... }
  async generate(messages: message[], options?: LLMOptions): Promise<LLMResponse|null>  { ... }

--- File: session/compaction.ts ---
export type Message = {
export type SummarizerCallback = (textToSummarize: string, previousSummary?: string) => Promise<string>;
export class Compaction  { ... }
    constructor(config: { maxTokens: number; maxOutputTokens: number })  { ... }
    async compact(history: Message[], summarizer: SummarizerCallback): Promise<Message[]>  { ... }
    public calculateTotalUsage(messages: Message[]): number  { ... }
    private estimate(text: string): number  { ... }

--- File: storage/memory.ts ---
import { message } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { connectDB } from "./mongoose";
import { Message } from "./models/message";
export default class Memory  { ... }
    constructor()  { ... }
    async init()  { ... }
    async addMessage(msg: message)  { ... }
    getMessages()  { ... }

--- File: storage/mongoose.ts ---
import mongoose from 'mongoose';
export const connectDB = async () => {

--- File: tool/base.ts ---
import { z } from 'zod';
export abstract class BaseTool<T extends z.ZodType>  { ... }
  abstract execute(args: z.infer<T>): Promise<string>; { ... }

--- File: tool/bash-parser.ts ---
export interface CommandInfo  { ... }
export interface SecurityIssue  { ... }
export interface ParseResult  { ... }
export class BashParser  { ... }
    async init(): Promise<void>  { ... }
    parse(command: string): ParseResult  { ... }
    private findError(node: any): any  { ... }
    private traverse(root: any, source: string)  { ... }
    private highlightFromSegments(source: string, segments: Array<{ start: number; end: number; color: string }>): string  { ... }
export async function getBashParser(): Promise<BashParser>  { ... }

--- File: tool/bash.test.ts ---
import { describe, it, expect } from 'vitest';
import BashTool from './bash';
import { getBashParser } from './bash-parser';

--- File: tool/bash.ts ---
import { BaseTool } from './base';
import { z } from 'zod';
import { getBashParser } from './bash-parser';
import { getPlatform,  execCommandAsync } from '../util/platform-cmd';
export default class BashTool extends BaseTool<typeof schema>  { ... }
    get description(): string  { ... }
    async execute(args: z.infer<typeof this.schema>): Promise<string>  { ... }
    private async runCommand(command: string): Promise<string>  { ... }
    private tryHandleCd(command: string): string | null  { ... }
    private normalizeCommand(command: string): string  { ... }
    private tokenize(command: string): { tokens: string[]; quoteTypes: Array<'"' | "'" | null> }  { ... }
    private truncateOutput(output: string): string  { ... }

--- File: tool/batch-replace.ts ---
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager';
export class BatchReplaceTool extends BaseTool<any>  { ... }
  async execute({ filePath, replacements }: z.infer<typeof this.schema>): Promise<string>  { ... }

--- File: tool/file.ts ---
import fs from 'fs';
import path from 'path';
import { isBinaryFile } from 'isbinaryfile';
import { z } from 'zod';
import { BaseTool } from './base';
import { getBackupManager } from '../util/backup-manager';
export class ReadFileTool extends BaseTool<typeof readFileSchema>  { ... }
  async execute(args: { filePath: string; startLine?: number; endLine?: number; }): Promise<string>  { ... }
export class WriteFileTool extends BaseTool<typeof writeFileSchema>  { ... }
  async execute({ filePath, content }: any)  { ... }

--- File: tool/glob.ts ---
import { z } from 'zod';
import { glob as fg } from 'fast-glob';
import { BaseTool } from './base';
export default class GlobTool extends BaseTool<typeof schema>  { ... }
    async execute({ pattern, path = '.', limit = 100 }: z.infer<typeof schema>): Promise<string>  { ... }

--- File: tool/grep.ts ---
import { search, type SearchMatch } from '@mcpc-tech/ripgrep-napi';
import { z } from 'zod';
import { BaseTool } from './base';
export default class GrepTool extends BaseTool<typeof schema>  { ... }
- Locating import statements or usage patterns
  async execute({ pattern, filePattern }: any): Promise<string>  { ... }

--- File: tool/index.test.ts ---
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, BaseTool } from './index';
import { z } from 'zod';
        async execute(args: z.infer<typeof this.schema>)  { ... }

--- File: tool/index.ts ---
 * import { ToolRegistry } from './index';
import { BaseTool } from './base';
import BashTool from './bash';
import GlobTool from './glob';
import { ReadFileTool } from './file';
import { WriteFileTool } from './file';
import GrepTool from './grep';
import { SurgicalEditTool } from './surgical';
import { BatchReplaceTool } from './batch-replace';
import { TodoReadTool } from './todo';
import { TodoWriteTool } from './todo';
import { RollbackTool, ListBackupsTool, CleanBackupsTool } from './rollback';
import { initializeMcp } from '../mcp/index.js';
export class ToolRegistry  { ... }
    private constructor() {} { ... }
    static register<T extends BaseTool<any>>(tool: T | T[]): void  { ... }
    static unregister(name: string): boolean  { ... }
    static get<T extends BaseTool<any> = BaseTool<any>>(name: string): T | undefined  { ... }
    static getAll(): BaseTool<any>[]  { ... }
    static getNames(): string[]  { ... }
    static has(name: string): boolean  { ... }
    static get size(): number  { ... }
    static clear(): void  { ... }
    static async execute(name: string, args: unknown): Promise<string>  { ... }
    static getSchemas(): Array< { ... }
    private static zodToJsonSchema(schema: any): Record<string, unknown>  { ... }
    private static zodTypeToJsonSchema(def: any, key?: string): Record<string, unknown>  { ... }
export function registerDefaultTools(): void  { ... }
 * import { registerDefaultToolsAsync } from './tool';
export async function registerDefaultToolsAsync(configPath?: string)  { ... }
export { BaseTool } from './base';
export { default as BashTool } from './bash';
export { getBashParser } from './bash-parser';
export type { CommandInfo, SecurityIssue, ParseResult } from './bash-parser';
export { BatchReplaceTool } from './batch-replace';

--- File: tool/rollback.ts ---
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import { getBackupManager, type BackupInfo } from '../util/backup-manager';
import chalk from 'chalk';
export class RollbackTool extends BaseTool<any>  { ... }
    async execute({ filePath, backupId }: z.infer<typeof this.schema>): Promise<string>  { ... }
export class ListBackupsTool extends BaseTool<any>  { ... }
    async execute({ filePath }: z.infer<typeof this.schema>): Promise<string>  { ... }
export class CleanBackupsTool extends BaseTool<any>  { ... }
    async execute({ filePath, confirm }: z.infer<typeof this.schema>): Promise<string>  { ... }

--- File: tool/surgical.ts ---
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { BaseTool } from './base';
import chalk from 'chalk';
import { getBackupManager } from '../util/backup-manager';
export  class SurgicalEditTool extends BaseTool<any>  { ... }
  async execute({ filePath, line, oldText, newText }: z.infer<typeof this.schema>): Promise<string>  { ... }

--- File: tool/todo.ts ---
import z  from "zod";
import { BaseTool } from "./base";
import {DESCRIPTION_WRITE} from './todowrite';
export class TodoWriteTool extends BaseTool<any>  { ... }
  async execute({todos}: {todos: z.infer<typeof TodoInfo>[]}): Promise<string>  { ... }
export class TodoReadTool extends BaseTool<any>  { ... }
  async execute()  { ... }

--- File: tool/todowrite.ts ---
export const DESCRIPTION_WRITE = `⚠️ CRITICAL: Use this tool to BREAK DOWN and TRACK complex tasks.

--- File: util/backup-manager.ts ---
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ScopedLogger } from './log';
export interface BackupInfo  { ... }
export interface BackupManagerConfig  { ... }
export class BackupManager  { ... }
    constructor(config: BackupManagerConfig = {})  { ... }
    async initialize(): Promise<void>  { ... }
    async backup(filePath: string): Promise<string | null>  { ... }
    async restore(filePath: string, backupId: string): Promise<boolean>  { ... }
    getBackups(filePath: string): BackupInfo[]  { ... }
    async deleteBackup(filePath: string, backupId: string): Promise<void>  { ... }
    async clean(filePath: string): Promise<void>  { ... }
    private async cleanOldBackups(filePath: string): Promise<void>  { ... }
    private generateBackupId(filePath: string): string  { ... }
    private addToIndex(filePath: string, backupInfo: BackupInfo): void  { ... }
    private removeFromIndex(filePath: string, backupId: string): void  { ... }
export function getBackupManager(config?: BackupManagerConfig): BackupManager  { ... }

--- File: util/log-format.ts ---
export function formatToolResult(toolName: string, result: string): string  { ... }
function formatSearchResults(result: string): string  { ... }
function formatFileContent(result: string): string  { ... }
function formatBashOutput(result: string): string  { ... }
function formatGlobResults(result: string): string  { ... }
function formatGeneric(result: string, maxPreview: number): string  { ... }

--- File: util/log.ts ---
import chalk from 'chalk';
import ora, { Ora } from 'ora';
function now(): string  { ... }
function stringify(input: unknown): string  { ... }
function enabled(current: LogLevel, target: LogLevel): boolean  { ... }
function prefix(level: Exclude<LogLevel, 'silent'>, scope?: string): string  { ... }
class ScopedLogger  { ... }
  constructor(scope?: string)  { ... }
  info(msg: unknown)  { ... }
  warn(msg: unknown)  { ... }
  error(msg: unknown)  { ... }
  success(msg: unknown)  { ... }
  debug(msg: unknown)  { ... }
  json(obj: unknown, label?: string)  { ... }
  spinner(text: string): Ora  { ... }
class Log  { ... }
  static setLevel(level: LogLevel)  { ... }
  static getLevel(): LogLevel  { ... }
  static info(msg: unknown, scope?: string)  { ... }
  static warn(msg: unknown, scope?: string)  { ... }
  static error(msg: unknown, scope?: string)  { ... }
  static success(msg: unknown, scope?: string)  { ... }
  static debug(msg: unknown, scope?: string)  { ... }
  static json(obj: unknown, label?: string, scope?: string)  { ... }
  static scope(name: string): ScopedLogger  { ... }
  static spinner(text: string, scope?: string): Ora  { ... }
  static spinnerSucceed(spinner: Ora, text?: string)  { ... }
  static spinnerFail(spinner: Ora, text?: string)  { ... }
  static spinnerStop(spinner: Ora)  { ... }
export default Log;
export { ScopedLogger };

--- File: util/platform-cmd.ts ---
import { execaCommandSync, execaCommand } from 'execa';
import iconv from 'iconv-lite';
export type Platform = 'windows' | 'mac' | 'linux';
export function getPlatform(): Platform  { ... }
export function getCommand(commandName: keyof typeof PLATFORM_COMMANDS): string  { ... }
export function normalizePath(path: string): string  { ... }
export function buildFindCommand(pattern: string, directory?: string): string  { ... }
export function buildListCommand(directory: string = '.'): string  { ... }
export function getPlatformAdvice(): string  { ... }
export function execCommand(command: string): { stdout: string; stderr: string; exitCode: number }  { ... }
export async function execCommandAsync( { ... }
function decodeShellOutput(output: unknown): string  { ... }
function normalizeTimeoutText(text: string): string  { ... }

--- File: cli/commands/clear.ts ---
import type { CommandHandler } from './types';
export const handler: CommandHandler = {
    async execute(context)  { ... }

--- File: cli/commands/exit.ts ---
import type { CommandHandler } from './types';
export const handler: CommandHandler = {
    execute(context)  { ... }

--- File: cli/commands/help.ts ---
import type { CommandHandler } from './types';
export const handler: CommandHandler = {
    execute()  { ... }

--- File: cli/commands/history.ts ---
import type { CommandHandler } from './types';
export const handler: CommandHandler = {
    async execute(context)  { ... }

--- File: cli/commands/index.ts ---
import type { CommandContext, CommandRegistry, CommandHandler } from './types';
import { handler as exitHandler } from './exit';
import { handler as clearHandler } from './clear';
import { handler as historyHandler } from './history';
import { handler as sessionHandler } from './session';
import { handler as helpHandler } from './help';
export function parseCommand(input: string): { command: string; args: string[] } | null  { ... }
export async function executeCommand( { ... }
export function getAllCommands(): CommandHandler[]  { ... }
export function getAllCommandNames(): string[]  { ... }
export function getCommandCompletions(input: string): string[]  { ... }

--- File: cli/commands/session.ts ---
import type { CommandHandler } from './types';
export const handler: CommandHandler = {
    async execute(context, args)  { ... }

--- File: cli/commands/types.ts ---
import type Agent from '../../agent';
export interface CommandContext  { ... }
export interface CommandHandler  { ... }
    execute(context: CommandContext, args: string[]): Promise<void> | void; { ... }
export type CommandRegistry = Record<string, CommandHandler>;

--- File: cli/utils/format.ts ---
export function formatTimestamp(date: Date): string  { ... }
export function truncate(text: string, maxLength: number, suffix = '...'): string  { ... }
export function formatMessagePreview(content: string, maxLength = 100): string  { ... }
export function formatRoleIcon(role: string): string  { ... }
export function formatListItem(index: number, text: string, icon = '•'): string  { ... }
export function separator(char = '─', length = 50): string  { ... }
export function formatSessionId(sessionId: string): string  { ... }

--- File: cli/utils/index.ts ---
export { InputHistory, formatPrompt, isCommand, extractCommandName } from './input';
export {

--- File: cli/utils/input.ts ---
export class InputHistory  { ... }
    add(input: string): void  { ... }
    getPrevious(): string | null  { ... }
    getNext(): string | null  { ... }
    reset(): void  { ... }
    getAll(): string[]  { ... }
    clear(): void  { ... }
export function formatPrompt(prompt: string, sessionId?: string): string  { ... }
export function isCommand(input: string): boolean  { ... }
export function extractCommandName(input: string): string | null  { ... }

--- File: cli/utils/reader.ts ---
import readline from 'readline';
import { InputHistory } from './input';
import { getAllCommands } from '../commands';
export interface ReaderOptions  { ... }
export interface ReaderResult  { ... }
async function showSelectableCommandMenu(): Promise<string>  { ... }
export function createReader(options: ReaderOptions): Promise<ReaderResult>  { ... }
export async function readWithHistory( { ... }
export function createReadlineInterface(prompt: string): readline.ReadLine  { ... }

--- File: cli/utils/smart-input.ts ---
import readline from 'readline';
import { InputHistory } from './input';
import { getAllCommands } from '../commands';
export interface SmartInputOptions  { ... }
export interface SmartInputResult  { ... }
function showCommands(): void  { ... }
export async function smartInput(options: SmartInputOptions): Promise<SmartInputResult>  { ... }
export async function readWithCommandCompletion( { ... }

--- File: storage/models/message.ts ---
import mongoose from 'mongoose';
export const Message = mongoose.model('Message', messageSchema);

--- File: storage/models/session.ts ---
import mongoose from 'mongoose';
export const SessionModel = mongoose.model('Session', sessionSchema);
