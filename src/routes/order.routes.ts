import { Elysia, t } from "elysia";
import { OrderController } from "../controllers/order.controller";
import { authGuard } from "../middleware/auth.middleware";
import jwt from "jsonwebtoken";
import { CreateOrderDto } from "../types/order.types";
import { OrderStatus } from "../models/order.model";

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
      .get('/get', async ({ headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        try {
            const orders = await OrderController.getAllOrders();
            return {
                success: true,
                data: orders
            };
        } catch (error: any) {
            set.status = 400;
            return {
                success: false,
                error: error.message
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
      .patch('/:id/update-status', async ({ params: { id }, body, headers, set }: { params: { id: string }, body: { status: string }, headers: any, set: any }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;
    
        try {
            const order = await OrderController.updateOrderStatus(id, body.status as OrderStatus);
            return {
                success: true,
                data: order
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
