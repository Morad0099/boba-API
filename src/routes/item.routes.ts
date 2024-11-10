// src/routes/item.routes.ts
import { Elysia } from 'elysia';
import { ItemController } from '../controllers/item.controller';

export const itemRoutes = (app: Elysia) => {
    return app.group('/api/items', (app) => 
        app
    .post('/add', async ({ request }) => {
        try {
            // Handle multipart form data
            const formData = await request.formData();
            const image = formData.get('image');

            if (!image || !(image instanceof File)) {
                throw new Error('Image is required');
            }

            // Create item data object
            const itemData = {
                name: formData.get('name') as string,
                category: formData.get('category') as string,
                description: formData.get('description') as string || '',
                price: Number(formData.get('price')),
                inStock: formData.get('inStock') === 'true'
            };

            // Validate required fields
            if (!itemData.name || !itemData.category || isNaN(itemData.price)) {
                throw new Error('Missing required fields');
            }

            const item = await ItemController.createItem(itemData, image);
            return {
                success: true,
                data: item
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    })
            .get('/category/:categoryId', async ({ params: { categoryId } }) => {
                try {
                    const items = await ItemController.getItemsByCategory(categoryId);
                    return {
                        success: true,
                        data: items
                    };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/get', async () => {
                try {
                    const items = await ItemController.getAllItems();
                    return {
                        success: true,
                        data: items
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