import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export interface ICustomer extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone_number: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country_code?: string;
  customer_code?: string;
  note?: string;
  total_points?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const customerSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    phone_number: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: { 
      type: String, 
      trim: true 
    },
    city: { 
      type: String, 
      trim: true 
    },
    region: { 
      type: String, 
      trim: true 
    },
    postal_code: { 
      type: String, 
      trim: true 
    },
    country_code: { 
      type: String, 
      trim: true 
    },
    customer_code: { 
      type: String, 
      trim: true 
    },
    note: { 
      type: String, 
      trim: true 
    },
    total_points: { 
      type: Number, 
      default: 0 
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hash password before saving
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});


// Method to compare password
customerSchema.methods.comparePassword = async function (
  phone_number: string
): Promise<boolean> {
  return bcrypt.compare(phone_number, this.password);
};


export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);