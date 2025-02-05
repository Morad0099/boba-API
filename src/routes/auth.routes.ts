import { Elysia } from "elysia";
import { AuthController } from "../controllers/auth.controller";
import { RegisterCustomerDto } from "../types/auth.types";

export const authRoutes = (app: Elysia) => {
  return app.group("/api/auth", (app) =>
    app.post('/register', async ({ body, headers }) => {
      try {
        console.log("Received headers:", headers); // Add this line to log headers

        // Extract the bearer token from the headers
        const token = headers['authorization']?.split(' ')[1];
        if (!token) {
          throw new Error('Authorization token is required');
        }
    
        // Validate the request body
        const registerData = body as RegisterCustomerDto;
    
        // Call the AuthController.register method with the token
        const result = await AuthController.register(registerData, token);
    
        // Return success response
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        // Return error response
        return {
          success: false,
          error: error.message || 'An error occurred during registration',
        };
      }
    })
    
      .post("/login", async ({ body }) => {
        try {
          const result = await AuthController.login(body as any);
          return {
            success: true,
            data: result,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .post("/logout", async ({ headers, set }) => {
        try {
          const accessToken = headers.authorization?.split(" ")[1];

          if (!accessToken) {
            set.status = 401;
            throw new Error("Authorization token is required");
          }

          await AuthController.logout(accessToken);
          return {
            success: true,
            message: "Logged out successfully",
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      })
  );
};
