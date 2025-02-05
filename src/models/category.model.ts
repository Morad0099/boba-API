import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
    name: string;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
    },
    color: {type: String}
}, {
    timestamps: true,
    versionKey: false
});

// Add index for faster queries
categorySchema.index({ name: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);