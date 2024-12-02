import { Elysia } from 'elysia';
import { ToppingController } from '../controllers/topping.controller';
import { authGuard } from '../middleware/auth.middleware';

export const toppingRoutes = (app: Elysia) => {
    return app.group('/api/toppings', (app) => 
        app
            .post('/add', async ({ body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const toppingData = body as {
                        name: string;
                        item: string;
                        price: number;
                        inStock?: boolean;
                    };

                    if (!toppingData.name || !toppingData.item || isNaN(toppingData.price)) {
                        throw new Error('Missing required fields');
                    }

                    const topping = await ToppingController.createTopping(toppingData);
                    return {
                        success: true,
                        data: topping
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/item/:itemId', async ({ params: { itemId }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    const toppings = await ToppingController.getToppingsForItem(itemId);
                    return {
                        success: true,
                        data: toppings
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
                    const toppings = await ToppingController.getAllToppings();
                    return {
                        success: true,
                        data: toppings
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