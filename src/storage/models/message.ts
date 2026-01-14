import mongoose from 'mongoose';
const messageSchema = new mongoose.Schema({
    userId: {
       type: String,
       required: true,
    },
    content: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'system', 'assistant','tool'],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    type: {
        type: String,
        enum: ['text','tool','tool_call'],
        default: 'text',
    },
})

export const Message = mongoose.model('Message', messageSchema);

