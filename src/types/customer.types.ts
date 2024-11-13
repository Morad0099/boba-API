import { AddressLabel } from '../models/address.model';

export interface UpdateCustomerDto {
    name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    dob?: Date;
}

export interface CreateAddressDto {
    label: AddressLabel;
    streetAddress: string;
    city: string;
    region: string;
    landmark?: string;
    additionalInfo?: string;
    isDefault?: boolean;
}

export interface CustomerProfileResponse {
    _id: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    dob: Date;
    addresses: Array<{
        _id: string;
        label: AddressLabel;
        streetAddress: string;
        city: string;
        region: string;
        landmark?: string;
        additionalInfo?: string;
        isDefault: boolean;
    }>;
}