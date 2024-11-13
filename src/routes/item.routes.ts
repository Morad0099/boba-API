// src/routes/item.routes.ts
import { Elysia } from 'elysia';
import { ItemController } from '../controllers/item.controller';
import { authGuard } from '../middleware/auth.middleware';

export const itemRoutes = (app: Elysia) => {
    return app.group('/api/items', (app) => 
        app
            .post('/add', async ({ request, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const formData = await request.formData();
                    const image = formData.get('image');

                    if (!image || !(image instanceof File)) {
                        throw new Error('Image is required');
                    }

                    const itemData = {
                        name: formData.get('name') as string,
                        category: formData.get('category') as string,
                        description: formData.get('description') as string || '',
                        price: Number(formData.get('price')),
                        inStock: formData.get('inStock') === 'true'
                    };

                    if (!itemData.name || !itemData.category || isNaN(itemData.price)) {
                        throw new Error('Missing required fields');
                    }

                    const item = await ItemController.createItem(itemData, image);
                    return {
                        success: true,
                        data: item
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/category/:categoryId', async ({ params: { categoryId }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const items = await ItemController.getItemsByCategory(categoryId);
                    return {
                        success: true,
                        data: items
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
                    const items = await ItemController.getAllItems();
                    return {
                        success: true,
                        data: items
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