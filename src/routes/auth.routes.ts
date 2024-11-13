import { Elysia } from 'elysia';
import { AuthController } from '../controllers/auth.controller';

export const authRoutes = (app: Elysia) => {
    return app.group('/api/auth', (app) => 
        app
            .post('/register', async ({ body }) => {
                try {
                    const result = await AuthController.register(body as any);
                    return {
                        success: true,
                        data: result
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .post('/login', async ({ body }) => {
                try {
                    const result = await AuthController.login(body as any);
                    return {
                        success: true,
                        data: result
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .post('/logout', async ({ headers, set }) => {
                try {
                    const accessToken = headers.authorization?.split(' ')[1];

                    if (!accessToken) {
                        set.status = 401;
                        throw new Error('Authorization token is required');
                    }

                    await AuthController.logout(accessToken);
                    
                    return {
                        success: true,
                        message: 'Logged out successfully'
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
    );
};