/**
 * Message 数据库模型
 */
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    content: {
        type: String,
    },
    role: {
        type: String,
        enum: ['user', 'system', 'assistant', 'tool'],
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'tool', 'tool_call','summary'],
        default: 'text',
    },
    /** Tool call ID (required for tool response messages) */
    toolCallId: {
        type: String,
        required: false,
    },
    /** Tool calls (serialized as JSON string) */
    toolCalls: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});

// 复合索引优化查询
messageSchema.index({ sessionId: 1, createdAt: 1 });

export const MessageData = mongoose.model('Message', messageSchema);
