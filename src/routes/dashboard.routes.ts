import { Elysia } from 'elysia';
import { DashboardController } from '../controllers/dashboard.controller';
import { authGuard } from '../middleware/auth.middleware';

export const dashboardRoutes = (app: Elysia) => {
    return app.group('/api/dashboard', (app) => 
        app
            .get('/', async ({ headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const dashboardData = await DashboardController.getDashboardData();
                    return {
                        success: true,
                        data: dashboardData
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