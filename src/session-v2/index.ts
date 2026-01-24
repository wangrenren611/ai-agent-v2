import path from "node:path";
import { LLMProvider, Message } from "../providers/base";
import fs, { mkdir } from 'node:fs/promises';
import { Compaction } from "./compaction";

export class SessionManager {
  id: string;
  messageList: Message[];
  sessionPath: string;
  private saveQueue: Promise<void> = Promise.resolve();
  maxOutputTokens: number;
  maxTokens: number;
  llmProvider: LLMProvider;

  constructor({
    sessionId,
    llmProvider
  }: {
    sessionId: string,
    llmProvider: LLMProvider
  }) {
    this.id = sessionId;
    this.messageList = []
    this.sessionPath = path.join('.memory', this.id);
    this.maxOutputTokens = llmProvider.maxOutputTokens;
    this.maxTokens = llmProvider.maxTokens
    this.llmProvider = llmProvider;
  }

  async init() {
    await mkdir(this.sessionPath, { recursive: true });
    try {
      const filePath = path.join(this.sessionPath, 'messages.json');
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const content = await fs.readFile(filePath, {
          encoding: 'utf-8'
        });

        const messageList = JSON.parse(content.trim());
        if (messageList.length) {
          this.messageList = messageList;
        }
      }
    } catch (_:any) {
      // 文件不存在或其他错误，忽略
      console.log("NOT FOUND HISTORY")
    }
  }

  addMessage(message: Message) {
    this.messageList.push(message);
    this.save(message);
  }


  private save(message: Message) {
    // 使用 Promise 链确保保存顺序，防止竞态条件
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        await fs.writeFile(
          path.join(this.sessionPath, 'messages.json'),
          JSON.stringify(this.messageList, null, 2)
        );
        await fs.appendFile(
          path.join(this.sessionPath, 'cache.md'),
          `\`\`\`\n${JSON.stringify(message, null, 2)}\n\`\`\`\n`,
          { flag: 'a' }
        );
      } catch (err) {
        console.error('Session save error:', err);
      }
    });
  }

  async getMessages(): Promise<Message[]> {
    return this.messageList
  }

  async clearAll() {
    this.messageList = [];
    await fs.writeFile(
      path.join(this.sessionPath, 'messages.json'),
      '[]'
    );
  }
}