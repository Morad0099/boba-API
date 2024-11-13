import { Elysia } from 'elysia';
import { CategoryController } from '../controllers/category.controller';
import { authGuard } from '../middleware/auth.middleware';

export const categoryRoutes = (app: Elysia) => {
    return app.group('/api/categories', (app) => 
        app
            .post('/add', async ({ body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const category = await CategoryController.createCategory(body as any);
                    return {
                        success: true,
                        data: category
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/get', async ({headers, set}) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;
                try {
                    const categories = await CategoryController.getAllCategories();
                    return {
                        success: true,
                        data: categories
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/get/:id', async ({ params: { id }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;
                try {
                    const category = await CategoryController.getCategoryById(id);
                    return {
                        success: true,
                        data: category
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