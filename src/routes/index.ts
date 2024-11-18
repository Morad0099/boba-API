import { Elysia } from 'elysia';
import { categoryRoutes } from './category.routes';
import { itemRoutes } from './item.routes';
import { authRoutes } from './auth.routes';
import { paymentNumberRoutes } from './payment-number.routes';
import { customerRoutes } from './customer.routes';
import { orderRoutes } from './order.routes';
import { transactionRoutes } from './transaction.routes';
import { adminRoutes } from './admin.routes';
import { dashboardRoutes } from './dashboard.routes';

export const setupRoutes = (app: Elysia) => {
    categoryRoutes(app);
    itemRoutes(app);
    authRoutes(app);
    paymentNumberRoutes(app);
    customerRoutes(app);
    orderRoutes(app);
    adminRoutes(app);
    transactionRoutes(app);
    dashboardRoutes(app);
    return app;
};