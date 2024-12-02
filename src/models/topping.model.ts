import mongoose, { Schema, Document } from 'mongoose';
import { IItem } from './item.model';
import { ICategory } from './category.model';

export interface ITopping extends Document {
    name: string;
    category: ICategory['_id'];
    price: number;
    description?: string;
    inStock: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const toppingSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Topping name is required'],
        trim: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    // description: {
    //     type: String,
    //     trim: true
    // },
    inStock: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Add compound index for faster item-based queries
toppingSchema.index({ item: 1, name: 1 });

export const Topping = mongoose.model<ITopping>('Topping', toppingSchema);