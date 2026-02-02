/**
 * 文件系统消息仓储实现
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import type { Message } from '../agent/message';
import { uuid } from 'uuidv4';
import type { IMessageRepository } from './types';

export interface FileSystemRepositoryConfig {
  sessionPath: string;
}

/**
 * 文件系统消息仓储
 * 
 * 职责：
 * 1. 消息的持久化存储
 * 2. 异步保存队列管理（防止竞态条件）
 * 3. 备份文件生成
 */
export class FileSystemMessageRepository implements IMessageRepository {
  private sessionPath: string;
  private saveQueue: Promise<void> = Promise.resolve();

  constructor(config: FileSystemRepositoryConfig) {
    this.sessionPath = config.sessionPath;
  }

  /**
   * 初始化仓储目录
   */
  async init(): Promise<void> {
    await fs.mkdir(this.sessionPath, { recursive: true });
  }

  /**
   * 从文件加载所有消息
   */
  async getAll(): Promise<Message[]> {
    try {
      const filePath = path.join(this.sessionPath, 'messages.json');
      const content = await fs.readFile(filePath, 'utf-8');
      const messages = JSON.parse(content.trim());
      
      if (Array.isArray(messages)) {
        return messages.map(msg => ({
          ...msg,
          messageId: msg.messageId || uuid(),
        }));
      }
    } catch {
      // 文件不存在或解析错误，返回空数组
    }
    return [];
  }

  /**
   * 保存单条消息
   * 使用队列确保写入顺序
   */
  async save(message: Message): Promise<void> {
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const messages = await this.getAll();
        messages.push({
          ...message,
          messageId: message.messageId || uuid(),
        });
        
        await this.writeMessages(messages);
        await this.appendToCache(message);
      } catch (err) {
        // 静默处理保存错误，避免影响主流程
      }
    });
    
    await this.saveQueue;
  }

  /**
   * 批量保存消息
   */
  async saveBatch(messages: Message[]): Promise<void> {
    if (messages.length === 0) return;

    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const existing = await this.getAll();
        const newMessages = messages.map(msg => ({
          ...msg,
          messageId: msg.messageId || uuid(),
        }));
        
        const combined = [...existing, ...newMessages];
        await this.writeMessages(combined);
        
        // 批量追加到缓存
        for (const msg of newMessages) {
          await this.appendToCache(msg);
        }
      } catch (err) {
        // 静默处理
      }
    });
    
    await this.saveQueue;
  }

  /**
   * 替换所有消息
   */
  async setAll(messages: Message[]): Promise<void> {
    const normalized = messages.map(msg => ({
      ...msg,
      messageId: msg.messageId || uuid(),
    }));
    
    await this.writeMessages(normalized);
  }

  /**
   * 清空所有消息
   */
  async clear(): Promise<void> {
    await this.writeMessages([]);
    
    // 可选：清空缓存文件
    try {
      const cachePath = path.join(this.sessionPath, 'cache.md');
      await fs.writeFile(cachePath, '');
    } catch {
      // 忽略错误
    }
  }

  // ---------------------------------------------------------------------------
  // 私有方法
  // ---------------------------------------------------------------------------

  /**
   * 写入消息到 JSON 文件
   */
  private async writeMessages(messages: Message[]): Promise<void> {
    const filePath = path.join(this.sessionPath, 'messages.json');
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2));
  }

  /**
   * 追加消息到缓存文件（Markdown 格式，便于人工阅读）
   */
  private async appendToCache(message: Message): Promise<void> {
    const cachePath = path.join(this.sessionPath, 'cache.md');
    const content = `\`\`\`\n${JSON.stringify(message, null, 2)}\n\`\`\`\n\n`;
    await fs.appendFile(cachePath, content, { flag: 'a' });
  }
}
