export type AdminRole = 'super_admin' | 'admin' | 'staff';

export interface CreateAdminDto {
    name: string;
    email: string;
    role: AdminRole;
}

export interface LoginAdminDto {
    email: string;
    password: string;
}

export interface AdminResponse {
    _id: string;
    name: string;
    email: string;
    role: AdminRole;
}

export interface AuthResponse {
    admin: AdminResponse;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}

export interface ToggleStatusDto {
    isActive: boolean;
}

export interface UpdateAdminDto {
    name?: string;
    email?: string;
    role?: AdminRole;
    password?: string;
}