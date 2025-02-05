// src/index.ts
import { Elysia } from "elysia";
import { connectDB } from "./config/database";
import { setupRoutes } from "./routes";
import { cors } from "@elysiajs/cors";
import "./cron/category-cron";

const app = new Elysia().use(
  cors({
    // Also add CORS to main app for auth routes
    origin: "*", // Or specify your frontend domain(s)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
    maxAge: 3600,
  })
);

// Connect to database
connectDB();

// Setup routes
setupRoutes(app);

// Start the server
app.listen(process.env.PORT || 4000, () => {
  console.log(
    `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
  );
});
