import { message } from "../providers/base";
import { connectDB } from "./mongoose";

export default class Memory {
    messages: message[];
    db: any;
     constructor() {
        this.messages = [];
    }

    async init() {
      const conn = await connectDB();
       this.db = conn;
      
    }
    
    addMessage(message: message) {
       this.messages.push(message);
    }

    getMessages() {
        return this.messages;
    }
}