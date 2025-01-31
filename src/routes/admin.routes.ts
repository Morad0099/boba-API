import { Elysia } from "elysia";
import { AdminController } from "../controllers/admin.controller";
import { authGuard } from "../middleware/auth.middleware";
import { roleGuard } from "../middleware/role.middleware";

export const adminRoutes = (app: Elysia) => {
  return app.group("/api/admin", (app) =>
    app
      .post("/register", async ({ body, headers, set }) => {
        // const auth = await authGuard({ headers, set });
        // if (auth !== true) return auth;

        // // Only super_admin can create new admins
        // const roleCheck = await roleGuard(['super_admin'])({ headers, set });
        // if (roleCheck !== true) return roleCheck;

        try {
          const admin = await AdminController.createAdmin(body as any);
          return {
            success: true,
            data: admin,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .post("/login", async ({ body }) => {
        try {
          const result = await AdminController.loginAdmin(body as any);
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
      .get("/get", async ({ headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        // Only super_admin and admin can view all admins
        // const roleCheck = await roleGuard(['super_admin', 'admin'])({ headers, set });
        // if (roleCheck !== true) return roleCheck;

        try {
          const admins = await AdminController.getAllAdmins();
          return {
            success: true,
            data: admins,
          };
        } catch (error: any) {
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
          const admin = await AdminController.getAdminById(id);
          return {
            success: true,
            data: admin,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .get("/role/:role", async ({ params: { role }, headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        // const roleCheck = await roleGuard(['super_admin'])({ headers, set });
        // if (roleCheck !== true) return roleCheck;

        try {
          const admins = await AdminController.getAdminsByRole(role as any);
          return {
            success: true,
            data: admins,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
          };
        }
      })
      .put("/update/:id", async ({ params: { id }, body, headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        // Only super_admin can update admin details
        // const roleCheck = await roleGuard(['super_admin'])({ headers, set });
        // if (roleCheck !== true) return roleCheck;

        try {
          const admin = await AdminController.updateAdmin(id, body as any);
          return {
            success: true,
            data: admin,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            error: error.message,
          };
        }
      })

      .delete("/delete/:id", async ({ params: { id }, headers, set }) => {
        const auth = await authGuard({ headers, set });
        if (auth !== true) return auth;

        // Only super_admin can delete admins
        // const roleCheck = await roleGuard(['super_admin'])({ headers, set });
        // if (roleCheck !== true) return roleCheck;

        try {
          const result = await AdminController.deleteAdmin(id);
          return {
            success: true,
            message: result.message,
          };
        } catch (error: any) {
          set.status = 400;
          return {
            success: false,
            error: error.message,
          };
        }
      })

      .patch(
        "/:id/toggle-status",
        async ({ params: { id }, body, headers, set }) => {
          const auth = await authGuard({ headers, set });
          if (auth !== true) return auth;

          // Only super_admin can toggle admin status
          // const roleCheck = await roleGuard(['super_admin'])({ headers, set });
          // if (roleCheck !== true) return roleCheck;

          try {
            const admin = await AdminController.toggleAdminStatus(id, body);
            return {
              success: true,
              data: admin,
              message: `Admin ${
                admin.isActive ? "activated" : "deactivated"
              } successfully`,
            };
          } catch (error: any) {
            set.status = 400;
            return {
              success: false,
              error: error.message,
            };
          }
        }
      )
  );
};
