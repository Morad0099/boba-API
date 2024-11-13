import { Transaction } from '../models/transaction.model';
import { Order } from '../models/order.model';

export class TransactionController {
    static async getCustomerTransactions(customerId: string) {
        try {
            // Find all transactions for orders belonging to the customer
            const transactions = await Transaction.find()
                .populate({
                    path: 'order',
                    match: { customer: customerId }, // Filter orders by customer
                    populate: [
                        {
                            path: 'items.item',
                            select: 'name price'
                        },
                        {
                            path: 'paymentNumber',
                            select: 'number provider'
                        }
                    ]
                })
                .sort({ createdAt: -1 });

            // Filter out transactions where order is null (not belonging to customer)
            const customerTransactions = transactions.filter(transaction => transaction.order);

            return customerTransactions;
        } catch (error) {
            throw error;
        }
    }

    static async getTransactionDetails(transactionId: string, customerId: string) {
        try {
            const transaction = await Transaction.findById(transactionId)
                .populate({
                    path: 'order',
                    match: { customer: customerId },
                    populate: [
                        {
                            path: 'items.item',
                            select: 'name price'
                        },
                        {
                            path: 'paymentNumber',
                            select: 'number provider accountName'
                        },
                        {
                            path: 'deliveryAddress',
                            select: 'streetAddress city region landmark additionalInfo'
                        }
                    ]
                });

            if (!transaction || !transaction.order) {
                throw new Error('Transaction not found');
            }

            return transaction;
        } catch (error) {
            throw error;
        }
    }

    static async getTransactionsByStatus(customerId: string, status: string) {
        try {
            const transactions = await Transaction.find({ status })
                .populate({
                    path: 'order',
                    match: { customer: customerId },
                    populate: [
                        {
                            path: 'items.item',
                            select: 'name price'
                        },
                        {
                            path: 'paymentNumber',
                            select: 'number provider'
                        }
                    ]
                })
                .sort({ createdAt: -1 });

            // Filter out transactions where order is null
            const customerTransactions = transactions.filter(transaction => transaction.order);

            return customerTransactions;
        } catch (error) {
            throw error;
        }
    }
}