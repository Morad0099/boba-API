import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
    token: string;
    tokenType: 'ACCESS' | 'REFRESH';
    expiresAt: Date;
}

const tokenBlacklistSchema = new Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    tokenType: {
        type: String,
        enum: ['ACCESS', 'REFRESH'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Document will be automatically deleted when expiry is reached
    }
});

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);