// src/index.ts
import { Elysia } from 'elysia';
import { connectDB } from './config/database';
import { setupRoutes } from './routes';
import staticPlugin from '@elysiajs/static';

const app = new Elysia()
    .use(staticPlugin({
        prefix: '/uploads',
        assets: 'uploads'
    }))
    .onError(({ error, set }) => {
        console.error('Error:', error);
        set.status = (error as any).status || 500;
        return {
            success: false,
            error: error.message
        };
    });

// Connect to database
connectDB();

// Setup routes
setupRoutes(app);

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);
});