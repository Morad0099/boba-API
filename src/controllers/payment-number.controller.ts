import { PaymentNumber, Provider } from '../models/payment-number.model';
import type { CreatePaymentNumberDto } from '../types/payment-number.types';
import type { ICustomer } from '../models/customer.model';

export class PaymentNumberController {
    static async addPaymentNumber(data: CreatePaymentNumberDto, customerId: string) {
        try {
            // Check if number already exists for this customer
            const existingNumber = await PaymentNumber.findOne({
                customer: customerId,
                number: data.number
            });

            if (existingNumber) {
                throw new Error('This payment number is already registered');
            }

            // If this is the first number, make it default
            const hasNumbers = await PaymentNumber.exists({ customer: customerId });
            const isDefault = data.isDefault || !hasNumbers;

            const paymentNumber = new PaymentNumber({
                ...data,
                customer: customerId,
                isDefault
            });

            await paymentNumber.save();
            return paymentNumber;
        } catch (error) {
            throw error;
        }
    }

    static async getCustomerPaymentNumbers(customerId: string) {
        try {
            return await PaymentNumber.find({ customer: customerId })
                .sort({ isDefault: -1, createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    static async setDefaultPaymentNumber(numberId: string, customerId: string) {
        try {
            const paymentNumber = await PaymentNumber.findOne({
                _id: numberId,
                customer: customerId
            });

            if (!paymentNumber) {
                throw new Error('Payment number not found');
            }

            // Set all other numbers to non-default
            await PaymentNumber.updateMany(
                { customer: customerId },
                { isDefault: false }
            );

            // Set this number as default
            paymentNumber.isDefault = true;
            await paymentNumber.save();

            return paymentNumber;
        } catch (error) {
            throw error;
        }
    }
}