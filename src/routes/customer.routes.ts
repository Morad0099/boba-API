import { Elysia } from 'elysia';
import { CustomerController } from '../controllers/customer.controller';
import { authGuard } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

export const customerRoutes = (app: Elysia) => {
    return app.group('/api/customer', (app) => 
        app
            .put('/profile/update', async ({ body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const customer = await CustomerController.updateProfile(
                        customerId,
                        body as any
                    );
                    
                    return {
                        success: true,
                        data: customer
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/profile/get', async ({ headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const profile = await CustomerController.getProfile(customerId);
                    
                    return {
                        success: true,
                        data: profile
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .post('/address/add', async ({ body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const address = await CustomerController.addAddress(
                        customerId,
                        body as any
                    );
                    
                    return {
                        success: true,
                        data: address
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .post('/address/set-default/:id', async ({ params: { id }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const address = await CustomerController.setDefaultAddress(
                        customerId,
                        id
                    );
                    
                    return {
                        success: true,
                        data: address
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .get('/addresses/get', async ({ headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const addresses = await CustomerController.getAddresses(customerId);
                    
                    return {
                        success: true,
                        data: addresses
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .put('/address/update/:id', async ({ params: { id }, body, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const address = await CustomerController.updateAddress(
                        customerId,
                        id,
                        body as any
                    );
                    
                    return {
                        success: true,
                        data: address
                    };
                } catch (error: any) {
                    set.status = 400;
                    return {
                        success: false,
                        error: error.message
                    };
                }
            })
            .delete('/address/delete/:id', async ({ params: { id }, headers, set }) => {
                const auth = await authGuard({ headers, set });
                if (auth !== true) return auth;

                try {
                    if (!headers.authorization) {
                        set.status = 401;
                        return {
                            success: false,
                            error: 'Authorization header is missing'
                        };
                    }
                    const token = headers.authorization.split(' ')[1];
                    const decoded = jwt.decode(token) as any;
                    const customerId = decoded.sub;

                    const result = await CustomerController.deleteAddress(
                        customerId,
                        id
                    );
                    
                    return {
                        success: true,
                        message: result.message
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