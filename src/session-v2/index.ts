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
    } catch (err) {
      // 文件不存在或其他错误，忽略
    }
  }

  addMessage(message: Message) {
    this.messageList.push(message);
    // Fire-and-forget：加入保存队列，不阻塞调用方
    this.save(message);
  }

  async compact() {
    const compaction = new Compaction({
      maxOutputTokens: this.maxOutputTokens,
      maxTokens: this.maxTokens,
      llmProvider: this.llmProvider
    });

    const token = compaction.getToken(this.messageList);
    console.log(`TOKEN: ${token.totalUsed}/${token.usableLimit}\n`);
    
    return await compaction.compact(this.messageList);
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
    // if (this.messageList.length < 10) {
    //   return this.messageList;
    // }

    const result = await this.compact();

    this.messageList = result.list;

    if (result.isCompacted && result.summaryMessage) {
      this.save(result.summaryMessage)
    }

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