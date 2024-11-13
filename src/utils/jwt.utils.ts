// src/utils/jwt.utils.ts
import jwt from 'jsonwebtoken';
import { ICustomer } from '../models/customer.model';
import { TokenBlacklist } from '../models/token-blacklist.model';

export class JWTUtils {
    private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret';
    private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
    private static readonly ACCESS_TOKEN_EXPIRY = '15m';
    private static readonly REFRESH_TOKEN_EXPIRY = '7d';

    static generateTokens(customer: ICustomer) {
        const accessToken = jwt.sign(
            { 
                sub: customer._id,
                email: customer.email 
            },
            this.ACCESS_TOKEN_SECRET,
            { expiresIn: this.ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { 
                sub: customer._id,
                email: customer.email 
            },
            this.REFRESH_TOKEN_SECRET,
            { expiresIn: this.REFRESH_TOKEN_EXPIRY }
        );

        return { accessToken, refreshToken };
    }

    static async verifyAccessToken(token: string) {
        // Check if token is blacklisted
        const isBlacklisted = await TokenBlacklist.findOne({ token });
        if (isBlacklisted) {
            throw new Error('Token has been revoked');
        }

        try {
            const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET);
            return decoded;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    static getTokenExpiration(token: string): Date {
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        if (!decoded || !decoded.exp) {
            throw new Error('Invalid token');
        }
        return new Date(decoded.exp * 1000);
    }

    static async blacklistToken(token: string, tokenType: 'ACCESS' | 'REFRESH') {
        const expiresAt = this.getTokenExpiration(token);
        
        await TokenBlacklist.create({
            token,
            tokenType,
            expiresAt
        });
    }
}