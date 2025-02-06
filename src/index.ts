import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { logger } from "@bogeychan/elysia-logger";
import { connectDB } from "./config/database";
import { setupRoutes } from "./routes";
import initCron from "./cron/cron.util";

class Server {
  private app: Elysia;

  constructor() {
    this.app = new Elysia({ name: "BoBa API" });
  }

  private setupMiddleware(): void {
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposeHeaders: ["Content-Range", "X-Content-Range"],
        credentials: true,
        maxAge: 3600,
      })
    );

    // Add logger middleware
    this.app.use(
      logger({
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
      })
    );

    // Add Swagger documentation in non-production environments
    if (process.env.NODE_ENV !== "production") {
      this.app.use(
        swagger({
          documentation: {
            info: {
              title: "BoBa API Documentation",
              version: "1.0.0",
            },
          },
        })
      );
    }
  }

  private setupErrorHandling(): void {
    this.app.onError(({ code, error, request }) => {
      console.error(
        `Error [${code}] during ${request.method} ${request.url}:`,
        error
      );

      return new Response(
        JSON.stringify({
          error: true,
          message:
            process.env.NODE_ENV === "production"
              ? "Internal Server Error"
              : (error as any).message,
          code,
        }),
        {
          status: code === "NOT_FOUND" ? 404 : 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });
  }

  private async setupDatabase(): Promise<void> {
    try {
      await connectDB();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("Failed to connect to database:", error);
      process.exit(1);
    }
  }

  private setupCronJobs(): void {
    try {
      initCron();
      console.log("✅ Cron jobs initialized");
    } catch (error) {
      console.error("Failed to initialize cron jobs:", error);
      // Don't exit process, as cron failure shouldn't stop the main server
    }
  }

  public async start(): Promise<void> {
    // Setup order matters
    this.setupMiddleware();
    this.setupErrorHandling();
    await this.setupDatabase();
    setupRoutes(this.app);
    this.setupCronJobs();

    const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;

    this.app.listen(port, () => {
      console.log(`
🚀 Server is running!
🌎 Hostname: ${this.app.server?.hostname}
🔌 Port: ${this.app.server?.port}
🌳 Environment: ${process.env.NODE_ENV || "development"}
      `);
    });
  }
}

// Create and start server
const server = new Server();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export default server;
