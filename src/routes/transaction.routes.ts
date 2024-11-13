import { Elysia } from 'elysia';
import { TransactionController } from '../controllers/transaction.controller';
import { authGuard } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

export const transactionRoutes = (app: Elysia) => {
    return app.group('/api/transactions', (app) => 
        app
            // Get all transactions for authenticated user
            .get('/get', async ({ headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
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

                    const transactions = await TransactionController.getCustomerTransactions(
                        customerId
                    );
                    
                    return {
                        success: true,
                        data: transactions
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            // Get specific transaction details
            .get('/get/:id', async ({ params: { id }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
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

                    const transaction = await TransactionController.getTransactionDetails(
                        id,
                        customerId
                    );
                    
                    return {
                        success: true,
                        data: transaction
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            // Get transactions by status
            .get('/status/:status', async ({ params: { status }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
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

                    const transactions = await TransactionController.getTransactionsByStatus(
                        customerId,
                        status.toUpperCase()
                    );
                    
                    return {
                        success: true,
                        data: transactions
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