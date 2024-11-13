import { Customer, Gender } from '../models/customer.model';
import * as jwt from 'jsonwebtoken';
import { JWTUtils } from '../utils/jwt.utils';
import type { RegisterCustomerDto, LoginCustomerDto, AuthResponse } from '../types/auth.types';
import { TokenBlacklist } from '../models/token-blacklist.model';

export class AuthController {
    static async register(data: RegisterCustomerDto): Promise<AuthResponse> {
        try {
            // Check if customer already exists
            const existingCustomer = await Customer.findOne({ email: data.email });
            if (existingCustomer) {
                throw new Error('Email already registered');
            }

            // Validate gender
            if (!Object.values(Gender).includes(data.gender.toUpperCase() as Gender)) {
                throw new Error('Invalid gender value. Must be either MALE or FEMALE');
            }

            // Parse and validate date
            const dob = new Date(data.dob);
            if (isNaN(dob.getTime())) {
                throw new Error('Invalid date format. Please use YYYY-MM-DD format');
            }

            // Create new customer with parsed date and uppercase gender
            const customer = new Customer({
                ...data,
                gender: data.gender.toUpperCase(),
                dob
            });
            await customer.save();

            // Generate tokens
            const tokens = JWTUtils.generateTokens(customer);

            // Prepare response
            return {
                customer: {
                    _id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    gender: customer.gender,
                    dob: customer.dob
                },
                tokens
            };
        } catch (error) {
            throw error;
        }
    }

    static async login(data: LoginCustomerDto): Promise<AuthResponse> {
        try {
            // Find customer
            const customer = await Customer.findOne({ email: data.email });
            if (!customer) {
                throw new Error('Invalid credentials');
            }

            // Verify password
            const isPasswordValid = await customer.comparePassword(data.password);
            if (!isPasswordValid) {
                throw new Error('Invalid credentials');
            }

            // Generate tokens
            const tokens = JWTUtils.generateTokens(customer);

            // Prepare response
            return {
                customer: {
                    _id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    gender: customer.gender,
                    dob: customer.dob
                },
                tokens
            };
        } catch (error) {
            throw error;
        }
    }

    static async logout(accessToken: string) {
        try {
            // Decode the token to get the payload
            const decoded = jwt.decode(accessToken) as any;
            if (!decoded) {
                throw new Error('Invalid token');
            }

            // Find customer's current valid tokens and blacklist them
            await TokenBlacklist.create([
                {
                    token: accessToken,
                    tokenType: 'ACCESS',
                    expiresAt: new Date(decoded.exp * 1000)
                },
                // We blacklist both access and refresh tokens
                {
                    token: accessToken,  // Using access token as identifier
                    tokenType: 'REFRESH',
                    expiresAt: new Date(decoded.exp * 1000 + 7 * 24 * 60 * 60 * 1000) // Refresh token expiry (7 days after access token)
                }
            ]);

            return { message: 'Logged out successfully' };
        } catch (error) {
            throw error;
        }
    }
}