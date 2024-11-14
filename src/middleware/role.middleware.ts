import jwt from 'jsonwebtoken';
import { AdminRole } from '../types/admin.types';

export const roleGuard = (allowedRoles: AdminRole[]) => {
    return async ({ headers, set }: { headers: Headers; set: any }) => {
        const authHeader = headers.get('authorization');
        if (!authHeader) {
            set.status = 401;
            return {
                success: false,
                error: 'No token provided'
            };
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            if (!allowedRoles.includes(decoded.role)) {
                set.status = 403;
                return {
                    success: false,
                    error: 'Insufficient permissions'
                };
            }
            return true;
        } catch (error) {
            set.status = 401;
            return {
                success: false,
                error: 'Invalid token'
            };
        }
    };
};