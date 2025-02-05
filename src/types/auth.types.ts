export interface RegisterCustomerDto {
    name: string;
    email: string;
    password: string;
    phone_number: string;
    address?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country_code?: string;
    customer_code?: string;
    note?: string;
    total_points?: number;
}

export interface LoginCustomerDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    customer: {
        _id: string;
        name: string;
        email: string;
        phone_number: string;
        address?: string;
        city?: string;
        region?: string;
        postal_code?: string;
        country_code?: string;
        customer_code?: string;
        note?: string;
        total_points?: number;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}