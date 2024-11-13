import { Provider } from '../models/payment-number.model';

export interface CreatePaymentNumberDto {
    number: string;
    accountName: string;
    provider: Provider;
    isDefault?: boolean;
}

export interface PaymentNumberResponse {
    _id: string;
    number: string;
    accountName: string;
    provider: Provider;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}