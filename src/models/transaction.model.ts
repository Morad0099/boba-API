// src/models/transaction.model.ts
import mongoose, { Schema, Document } from "mongoose";
import { IOrder } from "./order.model";

export enum TransactionStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export enum TransactionType {
  MOBILE_MONEY = "MOBILE_MONEY",
  // Add other payment types as needed
}

export interface ITransaction extends Document {
  order: IOrder["_id"];
  transactionReference: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"],
    },
    transactionReference: {
      type: String,
      unique: true,
      // Remove required since we'll generate it
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Generate transaction reference
transactionSchema.pre("save", async function (next) {
  try {
    if (!this.transactionReference) {
      // Only generate if not already set
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");

      // Get count of transactions for today for the sequence
      const today = new Date(date.setHours(0, 0, 0, 0));
      const count = await (
        this.constructor as mongoose.Model<ITransaction>
      ).countDocuments({
        createdAt: { $gte: today },
      });

      const sequence = (count + 1).toString().padStart(4, "0");
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

      this.transactionReference = `TXN${year}${month}${day}${sequence}${random}`;
    }
    next();
  } catch (error) {
    next(error as mongoose.CallbackError);
  }
});

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);
