// src/index.ts
import { Elysia } from 'elysia';
import { connectDB } from './config/database';
import { setupRoutes } from './routes';
import staticPlugin from '@elysiajs/static';

const app = new Elysia();

app.use(staticPlugin({
  prefix: '/uploads',  // URL prefix for static files
  assets: 'uploads'    // Directory containing static files
}));

// Connect to database
connectDB();

// Setup routes
setupRoutes(app);

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);
});