import { Customer } from '../models/customer.model';
import { Address } from '../models/address.model';
import type { UpdateCustomerDto, CreateAddressDto } from '../types/customer.types';

export class CustomerController {
    static async updateProfile(customerId: string, data: UpdateCustomerDto) {
        try {
            // If email is being updated, check if it's already taken
            if (data.email) {
                const existingCustomer = await Customer.findOne({
                    email: data.email,
                    _id: { $ne: customerId }
                });
                
                if (existingCustomer) {
                    throw new Error('Email already in use');
                }
            }

            const customer = await Customer.findByIdAndUpdate(
                customerId,
                { $set: data },
                { new: true, runValidators: true }
            ).select('-password');

            if (!customer) {
                throw new Error('Customer not found');
            }

            return customer;
        } catch (error) {
            throw error;
        }
    }

    static async getProfile(customerId: string) {
        try {
            const customer = await Customer.findById(customerId)
                .select('-password');
            
            if (!customer) {
                throw new Error('Customer not found');
            }

            const addresses = await Address.find({ customer: customerId })
                .sort({ isDefault: -1, createdAt: -1 });

            return {
                ...customer.toObject(),
                addresses
            };
        } catch (error) {
            throw error;
        }
    }

    static async addAddress(customerId: string, data: CreateAddressDto) {
        try {
            // If this is the first address, make it default
            const hasAddresses = await Address.exists({ customer: customerId });
            const isDefault = data.isDefault || !hasAddresses;

            const address = new Address({
                ...data,
                customer: customerId,
                isDefault
            });

            await address.save();
            return address;
        } catch (error) {
            throw error;
        }
    }

    static async setDefaultAddress(customerId: string, addressId: string) {
        try {
            const address = await Address.findOne({
                _id: addressId,
                customer: customerId
            });

            if (!address) {
                throw new Error('Address not found');
            }

            // Set all other addresses to non-default
            await Address.updateMany(
                { customer: customerId },
                { isDefault: false }
            );

            // Set this address as default
            address.isDefault = true;
            await address.save();

            return address;
        } catch (error) {
            throw error;
        }
    }

    static async getAddresses(customerId: string) {
        try {
            return await Address.find({ customer: customerId })
                .sort({ isDefault: -1, createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    static async updateAddress(customerId: string, addressId: string, data: Partial<CreateAddressDto>) {
        try {
            // First check if the address belongs to the customer
            const address = await Address.findOne({
                _id: addressId,
                customer: customerId
            });

            if (!address) {
                throw new Error('Address not found');
            }

            // If isDefault is being set to true, handle other addresses
            if (data.isDefault) {
                await Address.updateMany(
                    { customer: customerId, _id: { $ne: addressId } },
                    { isDefault: false }
                );
            }

            // Update the address
            const updatedAddress = await Address.findByIdAndUpdate(
                addressId,
                { $set: data },
                { new: true, runValidators: true }
            );

            return updatedAddress;
        } catch (error) {
            throw error;
        }
    }

    static async deleteAddress(customerId: string, addressId: string) {
        try {
            // Check if the address exists and belongs to the customer
            const address = await Address.findOne({
                _id: addressId,
                customer: customerId
            });

            if (!address) {
                throw new Error('Address not found');
            }

            // If this was the default address and there are other addresses,
            // make the most recent one the default
            if (address.isDefault) {
                const nextAddress = await Address.findOne({
                    customer: customerId,
                    _id: { $ne: addressId }
                }).sort({ createdAt: -1 });

                if (nextAddress) {
                    nextAddress.isDefault = true;
                    await nextAddress.save();
                }
            }

            // Delete the address
            await address.deleteOne();

            return { message: 'Address deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}