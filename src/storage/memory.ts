import { Message } from '../providers/base.js';
import { ScopedLogger } from '../util/log.js';
import { connectDB } from './mongoose.js';
import { MessageData } from './models/message.js';

export default class Memory {
    private logger: ScopedLogger;
    messages: Message[];
    db: unknown;

    constructor() {
      this.logger = new ScopedLogger('Memory');
      this.messages = [];
      this.db = null;
    }

    async init() {
        this.messages = [];
        const spinner = this.logger.spinner('Memory init');
        this.db = await connectDB();
        spinner.succeed('Memory init success');
    }

    async addMessage(msg: Message) {
       this.messages.push(msg);

       if (this.db) {
           // 持久化到数据库
           try {
               const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
               await MessageData.create({
                   userId: 'default',
                   content: msg.role==='tool'? "":contentStr,
                   role: msg.role,
                   type: msg.type || 'text',
               });
           } catch (error) {
               const errorMsg = error instanceof Error ? error.message : String(error);
               this.logger.error(`Failed to save message to database: ${errorMsg}`);
           }
       }
    }

    getMessages() {
        return this.messages;
    }
}
