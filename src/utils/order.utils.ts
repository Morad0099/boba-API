import type {
  OrderResponse,
  OrderResponseWithMessage,
} from "../types/order.types";
import type { IOrder } from "../models/order.model";
import type { Document, Types } from "mongoose";
import { TransactionStatus } from "../models/transaction.model";

interface PopulatedOrderItem {
  _id: Types.ObjectId;
  name: string;
  price: number;
}

interface PopulatedAddress {
  streetAddress: string;
  city: string;
  region: string;
  landmark?: string;
}

interface PopulatedPaymentNumber {
  number: string;
  provider: string;
}

export const transformOrderToResponse = (
  populatedOrder: Document<unknown, any, IOrder> & IOrder,
  transactionData: {
    transactionReference: string;
    status: TransactionStatus;
    message?: string;
  },
  paymentMessage?: string
): OrderResponseWithMessage => {
  const orderData = populatedOrder.toObject();

  return {
    _id: orderData._id.toString(),
    orderNumber: orderData.orderNumber,
    items: orderData.items.map((item) => ({
      item: {
        _id: (item.item as unknown as PopulatedOrderItem)._id.toString(),
        name: (item.item as unknown as PopulatedOrderItem).name,
        price: (item.item as unknown as PopulatedOrderItem).price,
      },
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),
    totalAmount: orderData.totalAmount,
    deliveryAddress: {
      streetAddress: (orderData.deliveryAddress as unknown as PopulatedAddress)
        .streetAddress,
      city: (orderData.deliveryAddress as unknown as PopulatedAddress).city,
      region: (orderData.deliveryAddress as unknown as PopulatedAddress).region,
      landmark: (orderData.deliveryAddress as unknown as PopulatedAddress)
        .landmark,
    },
    paymentNumber: {
      number: (orderData.paymentNumber as unknown as PopulatedPaymentNumber)
        .number,
      provider: (orderData.paymentNumber as unknown as PopulatedPaymentNumber)
        .provider,
    },
    status: orderData.status,
    transaction: {
      transactionReference: transactionData.transactionReference,
      status: transactionData.status,
      message: transactionData.message,
    },
    createdAt: orderData.createdAt.toISOString(),
    paymentMessage: paymentMessage || "",
  };
};
