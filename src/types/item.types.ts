// src/types/item.types.ts
export interface CreateItemDto {
    name: string;
    category: string;
    description?: string;
    price: number;
    // inStock?: boolean;
    // Remove image from DTO since we'll handle it separately
}

// Add type for the request body
export interface CreateItemRequestBody {
    name: string;
    category: string;
    description?: string;
    price: string | number;
    // inStock?: string | boolean;
}

export interface ItemResponse {
    _id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    image: string;
    imageUrl: string;
    // inStock: boolean;
    createdAt: string;
    updatedAt: string;
}