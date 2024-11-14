import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IAdmin extends Document {
    name: string;
    email: string;
    password: string;
    role: 'super_admin' | 'admin' | 'staff';
    isActive: boolean; 
    createdAt: Date;
    updatedAt: Date;
}

const adminSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'staff'],
        default: 'staff',
        required: [true, 'Role is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Add indexes for faster queries
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error as Error);
    }
});

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);