import { Message } from "../providers/providers/base";
import { ScopedLogger } from "../util/log";
import { connectDB } from "./mongoose";
import { MessageData } from "./models/message";

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
               // Convert MessageContent to string for storage
               let contentStr = '';
               if (typeof msg.content === 'string') {
                   contentStr = msg.content;
               } else if (Array.isArray(msg.content)) {
                   contentStr = msg.content.map(part => {
                       if (part.type === 'text') return part.text;
                       if (part.type === 'image_url') return '[Image]';
                       return '';
                   }).join('');
               }

               await MessageData.create({
                   userId: 'default',
                   content: msg.role === 'tool' ? '' : contentStr,
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
