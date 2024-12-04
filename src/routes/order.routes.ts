import { Elysia, t } from "elysia";
import { OrderController } from "../controllers/order.controller";
import { authGuard } from "../middleware/auth.middleware";
import jwt from "jsonwebtoken";
import { CreateOrderDto } from "../types/order.types";
import { OrderStatus } from "../models/order.model";
type CallbackPayload = {
  code: string;
  transactionId: string;
  status?: string;
  message?: string;
  [key: string]: any; // For any additional fields from payment provider
};
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
      .post(
        "/callback",
        async ({ body, set }) => {
          try {
            const result = await OrderController.handleCallback(body as any);
            return {
              success: true,
              data: result
            };
          } catch (error: any) {
            set.status = 500;
            return {
              success: false,
              message: error.message
            };
          }
        },
        {
          // Define body schema for validation
          body: t.Object({
            code: t.String(),
            transactionId: t.String(),
            status: t.Optional(t.String()),
            message: t.Optional(t.String())
          })
        }
      )
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
