// src/models/order.model.ts
import mongoose, { Schema, Document } from "mongoose";
import { ICustomer } from "./customer.model";
import { IAddress } from "./address.model";
import { IPaymentNumber } from "./payment-number.model";
import { IItem } from "./item.model";
import { Types } from "mongoose";
import { ITopping } from "./topping.model";

export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  CONFIRMED = "CONFIRMED",
  DELIVERING = "DELIVERING",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export interface OrderItem {
  item: IItem["_id"];
  quantity: number;
  price: number;
  subtotal: number;
  toppings: Array<{
    topping: ITopping["_id"];
    price: number;
  }>;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId | ICustomer;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: Types.ObjectId | IAddress;
  paymentNumber: Types.ObjectId | IPaymentNumber;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },
    orderNumber: {
      type: String,
      unique: true,
      // Remove required here since we'll generate it
    },
    partnerReceiptId: String,
    partnerReceiptData: Object,
    items: [
      {
        item: {
          type: Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Price cannot be negative"],
        },
        subtotal: {
          type: Number,
          required: true,
        },
        toppings: [
          {
            topping: {
              type: Schema.Types.ObjectId,
              ref: "Topping",
              required: true,
            },
            price: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    deliveryAddress: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: [true, "Delivery address is required"],
    },
    paymentNumber: {
      type: Schema.Types.ObjectId,
      ref: "PaymentNumber",
      required: [true, "Payment number is required"],
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Generate order number
orderSchema.pre("save", async function (next) {
  try {
    if (!this.orderNumber) {
      // Only generate if not already set
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");

      // Get count of orders for today for the sequence
      const today = new Date(date.setHours(0, 0, 0, 0));
      const count = await mongoose.model("Order").countDocuments({
        createdAt: { $gte: today },
      });

      const sequence = (count + 1).toString().padStart(4, "0");

      this.orderNumber = `ORD${year}${month}${day}${sequence}`;
    }
    next();
  } catch (error) {
    next(error as mongoose.CallbackError);
  }
});

export const Order = mongoose.model<IOrder>("Order", orderSchema);
