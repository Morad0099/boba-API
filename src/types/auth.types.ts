import { Gender } from "../models/customer.model";

// src/types/auth.types.ts
export interface RegisterCustomerDto {
    name: string;
    email: string;
    password: string;
    phone: string;
    dob: Date;
    gender: Gender;
}

export interface LoginCustomerDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    customer: {
        _id: string;
        name: string;
        email: string;
        phone: string;
        dob: Date;
        gender: Gender;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}