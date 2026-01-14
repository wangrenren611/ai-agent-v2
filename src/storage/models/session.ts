/**
 * Session 数据库模型
 */
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});

export const SessionModel = mongoose.model('Session', sessionSchema);
