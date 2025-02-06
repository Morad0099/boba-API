import mongoose, { Schema, Document } from "mongoose";
import { ICategory } from "./category.model";

export interface IItem extends Document {
  partnerItemId: string;
  parnterVarientId: string;
  name: string;
  category: ICategory["_id"];
  description?: string;
  price: number;
  inStock: boolean;
  image: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema(
  {
    parnterVarientId: String,
    partnerItemId: String,
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: {
      type: String,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add compound index for faster category-based queries
itemSchema.index({ category: 1, name: 1 });

export const Item = mongoose.model<IItem>("Item", itemSchema);
