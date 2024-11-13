import mongoose, { Schema, Document } from 'mongoose';
import { ICustomer } from './customer.model';

export enum Provider {
    MTN = 'MTN',
    VODAFONE = 'VODAFONE',
    AIRTELTIGO = 'AIRTELTIGO'
}

export interface IPaymentNumber extends Document {
    customer: ICustomer['_id'];
    number: string;
    accountName: string;
    provider: Provider;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const paymentNumberSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    number: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: function(v: string) {
                // Basic Ghanaian phone number validation
                return /^0[2-7][0-9]{8}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    accountName: {
        type: String,
        required: [true, 'Account name is required'],
        trim: true
    },
    provider: {
        type: String,
        enum: Object.values(Provider),
        required: [true, 'Provider is required']
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// Ensure only one default number per customer
paymentNumberSchema.pre('save', async function(next) {
    if (this.isDefault) {
        await this.model('PaymentNumber').updateMany(
            { customer: this.customer, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

export const PaymentNumber = mongoose.model<IPaymentNumber>('PaymentNumber', paymentNumberSchema);