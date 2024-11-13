import { Elysia } from "elysia";
import { OrderController } from "../controllers/order.controller";
import { authGuard } from "../middleware/auth.middleware";
import jwt from "jsonwebtoken";
import { CreateOrderDto } from "../types/order.types";

export const orderRoutes = (app: Elysia) => {
  return app.group("/api/orders", (app) =>
    app
      .post("/create", async ({ body, headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        try {
          if (!headers.authorization) {
            set.status = 401;
            return {
              success: false,
              error: "Authorization header is missing",
            };
          }
          const token = headers.authorization.split(" ")[1];
          const decoded = jwt.decode(token) as any;
          const customerId = decoded.sub;

          const order = await OrderController.createOrder(
            customerId,
            body as CreateOrderDto
          );

          return {
            success: true,
            data: order,
            message: order.paymentMessage, // Include payment message in response
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .get("/my-orders", async ({ headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        try {
          if (!headers.authorization) {
            set.status = 401;
            return {
              success: false,
              error: "Authorization header is missing",
            };
          }
          const token = headers.authorization.split(" ")[1];
          const decoded = jwt.decode(token) as any;
          const customerId = decoded.sub;

          const orders = await OrderController.getOrdersByCustomer(customerId);

          return {
            success: true,
            data: orders,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .get("/get/:id", async ({ params: { id }, headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        try {
          if (!headers.authorization) {
            set.status = 401;
            return {
              success: false,
              error: "Authorization header is missing",
            };
          }
          const token = headers.authorization.split(" ")[1];
          const decoded = jwt.decode(token) as any;
          const customerId = decoded.sub;

          const order = await OrderController.getOrderDetails(id, customerId);

          return {
            success: true,
            data: order,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            error: error.message,
          };
        }
      })
  );
};
