import { OrderStatus } from '../models/order.model';
import { TransactionStatus } from '../models/transaction.model';

export interface CreateOrderItemDto {
    itemId: string;
    quantity: number;
}

export interface CreateOrderDto {
    items: CreateOrderItemDto[];
    deliveryAddressId: string;
    paymentNumberId: string;
}

export interface OrderResponse {
    _id: string;
    orderNumber: string;
    items: Array<{
        item: {
            _id: string;
            name: string;
            price: number;
        };
        quantity: number;
        price: number;
        subtotal: number;
    }>;
    totalAmount: number;
    deliveryAddress: {
        streetAddress: string;
        city: string;
        region: string;
        landmark?: string;
    };
    paymentNumber: {
        number: string;
        provider: string;
    };
    status: OrderStatus;
    transaction: {
        transactionReference: string;
        status: TransactionStatus;
        message?: string;
    };
    createdAt: string;
}

export interface OrderResponseWithMessage extends OrderResponse {
    paymentMessage: string;
}