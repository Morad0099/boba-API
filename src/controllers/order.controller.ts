import { Order, OrderStatus } from '../models/order.model';
import { Transaction, TransactionStatus, TransactionType } from '../models/transaction.model';
import { Item } from '../models/item.model';
import { Address } from '../models/address.model';
import { PaymentNumber } from '../models/payment-number.model';
import { Customer } from '../models/customer.model';
import type { CreateOrderDto, OrderResponse, OrderResponseWithMessage } from '../types/order.types';
import { transformOrderToResponse } from '../utils/order.utils';


// LazyPay API integration
const LAZYPAY_BASE_URL = 'https://lazypaygh.com/api';
const MERCHANT_ID = '63dcd6fbf7f60ec473d09885';
const API_KEY = '56babbf4-34dc-4d26-b58e-c9809c7bb364';
const CALLBACK_URL = 'https://your-domain.com/api/v1/transactions/callback';

class LazyPayAPI {
    static async getToken(operation = 'DEBIT'): Promise<string> {
        const response = await fetch(`${LAZYPAY_BASE_URL}/hub/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                merchantId: MERCHANT_ID,
                apikey: API_KEY,
                operation
            })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.message);
        return data.data;
    }

    static async initiatePayment(data: {
        amount: number;
        account_number: string;
        account_name: string;
        account_issuer: string;
        description: string;
        externalTransactionId: string;
    }, token: string) {
        const response = await fetch(`${LAZYPAY_BASE_URL}/hub/debit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                ...data,
                callbackUrl: CALLBACK_URL,
                amount: Number(data.amount).toFixed(2),
                account_issuer: data.account_issuer.toLowerCase()
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        return result;
    }
}

export class OrderController {
    static async createOrder(customerId: string, data: CreateOrderDto): Promise<OrderResponseWithMessage> {
        try {
            // Validate delivery address
            const address = await Address.findOne({
                _id: data.deliveryAddressId,
                customer: customerId
            });
            if (!address) throw new Error('Invalid delivery address');

            // Validate payment number
            const paymentNumber = await PaymentNumber.findOne({
                _id: data.paymentNumberId,
                customer: customerId
            });
            if (!paymentNumber) throw new Error('Invalid payment number');

            // Get customer details
            const customer = await Customer.findById(customerId);
            if (!customer) throw new Error('Customer not found');

            // Calculate order items and total
            const orderItems = await Promise.all(
                data.items.map(async (item) => {
                    const productItem = await Item.findById(item.itemId);
                    if (!productItem) throw new Error(`Item not found: ${item.itemId}`);

                    return {
                        item: productItem._id,
                        quantity: item.quantity,
                        price: productItem.price,
                        subtotal: productItem.price * item.quantity
                    };
                })
            );

            const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

            // Create order
            const order = new Order({
                customer: customerId,
                items: orderItems,
                totalAmount,
                deliveryAddress: address._id,
                paymentNumber: paymentNumber._id,
                status: OrderStatus.PENDING
            });

            await order.save();

            // Create transaction
            const transaction = new Transaction({
                order: order._id,
                amount: totalAmount,
                type: TransactionType.MOBILE_MONEY,
                status: TransactionStatus.PENDING,
                metadata: {
                    paymentNumber: paymentNumber.number,
                    provider: paymentNumber.provider,
                    customerName: customer.name,
                    customerPhone: customer.phone
                }
            });

            await transaction.save();

            // Initiate mobile money payment
            try {
                const token = await LazyPayAPI.getToken();
                const paymentResponse = await LazyPayAPI.initiatePayment({
                    amount: totalAmount,
                    account_number: paymentNumber.number,
                    account_name: customer.name,
                    account_issuer: paymentNumber.provider,
                    description: `Payment for order ${order.orderNumber}`,
                    externalTransactionId: transaction.transactionReference
                }, token);

                // Update transaction with payment provider response
                await transaction.updateOne({
                    $set: {
                        'metadata.paymentProviderRef': paymentResponse.transactionId,
                        'metadata.paymentStatus': paymentResponse.code === '01' ? 'INITIATED' : 'FAILED',
                        'metadata.paymentResponse': paymentResponse
                    }
                });

                // Return order with populated fields
                const populatedOrder = await Order.findById(order._id)
                    .populate('items.item', 'name price')
                    .populate('deliveryAddress', 'streetAddress city region landmark')
                    .populate('paymentNumber', 'number provider')
                    .populate('customer', 'name phone');

                if (!populatedOrder) throw new Error('Failed to populate order');

                // Prepare response message based on provider
                const paymentMessage = paymentNumber.provider.toLowerCase() === 'mtn'
                    ? 'Transaction Pending. Kindly dial *170#, select 6) Wallet, Choose 3) My Approvals and enter MM PIN to approve payment immediately.'
                    : `Transaction Pending. A message has been sent to your mobile phone for the deduction of GHS${totalAmount}, Please enter your pin to confirm.`;

                const orderResponse = transformOrderToResponse(
                    populatedOrder,
                    {
                        transactionReference: transaction.transactionReference,
                        status: transaction.status,
                        message: paymentMessage
                    },
                    paymentMessage
                );

                return orderResponse;

            } catch (error: any) {
                // If payment initiation fails, update order and transaction status
                await order.updateOne({ status: OrderStatus.CANCELLED });
                await transaction.updateOne({ status: TransactionStatus.FAILED });
                throw new Error(`Payment initiation failed: ${error.message}`);
            }

        } catch (error) {
            throw error;
        }
    }


    // Add callback handler for payment provider webhook
    static async handlePaymentCallback(callbackData: any) {
        try {
            const transaction = await Transaction.findOne({
                'metadata.paymentProviderRef': callbackData.transactionId
            });

            if (!transaction) throw new Error('Transaction not found');

            const order = await Order.findById(transaction.order);
            if (!order) throw new Error('Order not found');

            // Update transaction and order status based on callback
            const status = callbackData.status.toUpperCase();
            await transaction.updateOne({
                status: status === 'SUCCESS' ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
                'metadata.paymentCallback': callbackData
            });

            if (status === 'SUCCESS') {
                await order.updateOne({ status: OrderStatus.CONFIRMED });
                
                // Send SMS notification
                const message = `Payment confirmed: ${transaction.transactionReference}. GHS ${transaction.amount} received. Thank you for your order!`;
                // Implement SMS sending logic here
            } else {
                await order.updateOne({ status: OrderStatus.CANCELLED });
            }

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    static async getOrdersByCustomer(customerId: string) {
        try {
            const orders = await Order.find({ customer: customerId })
                .populate('items.item', 'name price')
                .populate('deliveryAddress', 'streetAddress city region landmark')
                .populate('paymentNumber', 'number provider')
                .sort({ createdAt: -1 });

            const ordersWithTransactions = await Promise.all(
                orders.map(async (order) => {
                    const transaction = await Transaction.findOne({ order: order._id })
                        .select('transactionReference status');

                    return {
                        ...order.toObject(),
                        transaction: transaction
                    };
                })
            );

            return ordersWithTransactions;
        } catch (error) {
            throw error;
        }
    }

    static async getOrderDetails(orderId: string, customerId: string) {
        try {
            const order = await Order.findOne({ _id: orderId, customer: customerId })
                .populate('items.item', 'name price')
                .populate('deliveryAddress', 'streetAddress city region landmark')
                .populate('paymentNumber', 'number provider')
                .populate({
                    path: 'customer',
                    select: 'name phone'
                });

            if (!order) {
                throw new Error('Order not found');
            }

            const transaction = await Transaction.findOne({ order: order._id })
                .select('transactionReference status');

            return {
                ...order.toObject(),
                transaction
            };
        } catch (error) {
            throw error;
        }
    }

    static async getAllOrders() {
        try {
            return await Order.find()
                .sort({ createdAt: -1 })
                .populate('customer')
                .populate('items.item'); // This will populate the item details
        } catch (error) {
            throw error;
        }
    }

    static async updateOrderStatus(orderId: string, status: OrderStatus) {
        try {
            const order = await Order.findById(orderId);
            if (!order) {
                throw new Error('Order not found');
            }
    
            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { $set: { status } },
                { new: true }
            ).populate('customer')
             .populate('items.item');
    
            return updatedOrder;
        } catch (error) {
            throw error;
        }
    }
}
