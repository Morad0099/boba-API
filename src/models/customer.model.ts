// src/models/customer.model.ts
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
  phone: string;
  gender: Gender;
  dob: Date;
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
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    // gender: {
    //     type: String,
    //     // required: [true, 'Gender is required'],
    //     enum: Object.values(Gender),
    //     uppercase: true,
    //     trim: true
    // },
    // dob: {
    //     type: Date,
    //     // required: [true, 'Date of birth is required'],
    //     validate: {
    //         validator: function(value: Date) {
    //             return value <= new Date();
    //         },
    //         message: 'Date of birth cannot be in the future'
    //     }
    // }
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
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);
