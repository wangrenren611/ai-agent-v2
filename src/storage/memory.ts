import { message } from "../providers/base";
import { ScopedLogger } from "../util/log";
import { connectDB } from "./mongoose";
import { Message } from "./models/message";

export default class Memory {
    private logger: ScopedLogger;
    messages: message[];
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

    async addMessage(msg: message) {
       this.messages.push(msg);

       if (this.db) {
           // 持久化到数据库
           try {
               await Message.create({
                   userId: 'default',
                   content: msg.content,
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
