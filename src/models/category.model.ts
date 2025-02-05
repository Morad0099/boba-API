import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  partnerCategoryId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema(
  {
    partnerCategoryId: String,
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    color: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add index for faster queries
categorySchema.index({ name: 1 });

export const Category = mongoose.model<ICategory>("Category", categorySchema);
