import mongoose, { Schema, Document } from 'mongoose';
import { ICustomer } from './customer.model';

export enum AddressLabel {
    HOME = 'HOME',
    OFFICE = 'OFFICE',
    OTHER = 'OTHER'
}

export interface IAddress extends Document {
    customer: ICustomer['_id'];
    label: AddressLabel;
    streetAddress: string;
    city: string;
    region: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const addressSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    label: {
        type: String,
        enum: Object.values(AddressLabel),
        required: [true, 'Address label is required']
    },
    streetAddress: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    region: {
        type: String,
        required: [true, 'Region is required'],
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// Ensure only one default address per customer
addressSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.model('Address').updateMany(
            { customer: this.customer, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

export const Address = mongoose.model<IAddress>('Address', addressSchema);