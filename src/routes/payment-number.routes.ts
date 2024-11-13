// src/routes/payment-number.routes.ts
import { Elysia } from 'elysia';
import { PaymentNumberController } from '../controllers/payment-number.controller';
import { authGuard } from '../middleware/auth.middleware';
import { Provider } from '../models/payment-number.model';
import { Customer } from '../models/customer.model';
import jwt from 'jsonwebtoken';

export const paymentNumberRoutes = (app: Elysia) => {
    return app.group('/api/payment-numbers', (app) => 
        app
            .post('/add', async ({ body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    // Get customer ID from token
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const paymentNumber = await PaymentNumberController.addPaymentNumber(
                        body as any,
                        customerId
                    );
                    
                    return {
                        success: true,
                        data: paymentNumber
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/get', async ({ headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    // Get customer ID from token
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const paymentNumbers = await PaymentNumberController.getCustomerPaymentNumbers(
                        customerId
                    );
                    
                    return {
                        success: true,
                        data: paymentNumbers
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .post('/set-default/:id', async ({ params: { id }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    // Get customer ID from token
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const paymentNumber = await PaymentNumberController.setDefaultPaymentNumber(
                        id,
                        customerId
                    );
                    
                    return {
                        success: true,
                        data: paymentNumber
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
    );
};