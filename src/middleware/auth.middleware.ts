// src/middleware/auth.middleware.ts
import { Elysia } from 'elysia';
import { JWTUtils } from '../utils/jwt.utils';
import { Customer } from '../models/customer.model';
import { Admin } from '../models/admin.model';

interface AuthResponse {
    success: boolean;
    customer?: any;
    error?: string;
}

export const authGuard = async ({ headers, set }: { headers: any, set: any }) => {
    try {
        const authHeader = headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            set.status = 401;
            return {
                success: false,
                error: 'No token provided'
            };
        }

        const token = authHeader.split(' ')[1];
        
        const decoded = await JWTUtils.verifyAccessToken(token) as any;
        const customer = await Customer.findById(decoded.sub).select('-password');
        const admin = await Admin.findById(decoded.sub).select('-password');
        
        if (!customer && !admin) {
            set.status = 401;
            return {
                success: false,
                error: 'Invalid token - User not found'
            };
        }

        return true;
    } catch (error: any) {
        set.status = 401;
        return {
            success: false,
            error: error.message || 'Unauthorized'
        };
    }
};