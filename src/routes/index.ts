import { Elysia } from 'elysia';
import { categoryRoutes } from './category.routes';
import { itemRoutes } from './item.routes';

export const setupRoutes = (app: Elysia) => {
    categoryRoutes(app);
    itemRoutes(app);
    return app;
};