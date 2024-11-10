export interface CreateCategoryDto {
    name: string;
}

export interface CategoryResponse {
    _id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}