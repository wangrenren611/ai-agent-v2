import path from "node:path";
import { LLMProvider } from "../providers/providers/base";
import fs, { mkdir } from 'node:fs/promises';
import { Message } from '../agent/message';
import { uuid } from 'uuidv4';



export class SessionManager {
  id: string;
  messageList: Message[];
  sessionPath: string;
  private saveQueue: Promise<void> = Promise.resolve();
  llmProvider: LLMProvider;
  
  constructor({
    sessionId,
    sessionDir,
    llmProvider
  }: {
    sessionId: string;
    sessionDir?: string;
    llmProvider: LLMProvider
  }) {
    this.id = sessionId;
    this.messageList = []
    this.sessionPath = sessionDir || path.join('.agent-cache', 'sessions', this.id);
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
    } catch (_: any) {
      // 文件不存在或其他错误，忽略
    //  console.log("NOT FOUND HISTORY")
    }
  }

  addMessage(message: Message): Message {
      const item = {
        ...message,
        messageId:message?.messageId || uuid(),
      };
      this.messageList.push(item);
      this.save(item);
      return item;
  }
  
  addMessages(messages: Message[]) {
    messages.forEach(msg => this.addMessage(msg));
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

   getMessages(): Message[] {
    return this.messageList
  }

  async setMessages(messages: Message[]) {
    this.messageList = messages.map(msg => ({
      ...msg,
      messageId:msg.messageId || uuid(),
    }));
    await fs.writeFile(
      path.join(this.sessionPath, 'messages.json'),
      JSON.stringify(this.messageList, null, 2)
    );
  }

  async clearAll() {
    this.messageList = [];
    await fs.writeFile(
      path.join(this.sessionPath, 'messages.json'),
      '[]'
    );
  }
}
