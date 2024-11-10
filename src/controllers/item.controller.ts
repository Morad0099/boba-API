import { Item } from '../models/item.model';
import { Category } from '../models/category.model';
import type { CreateItemDto } from '../types/item.types';
import { FileUtils } from '../utils/file.utils';

export class ItemController {
    static async createItem(data: Omit<CreateItemDto, 'image'>, image: File) {
        try {
            // Verify category exists
            const category = await Category.findById(data.category);
            if (!category) {
                throw new Error('Category not found');
            }

            // Save image and get path
            const imagePath = await FileUtils.saveImage(image);

            // Create item with image path
            const item = new Item({
                ...data,
                image: imagePath
            });
            await item.save();

            // Add image URL to response
            const response = item.toObject();
            response.imageUrl = FileUtils.getImageUrl(imagePath);

            return response;
        } catch (error) {
            throw error;
        }
    }

    static async getItemsByCategory(categoryId: string) {
        try {
            // Verify category exists
            const category = await Category.findById(categoryId);
            if (!category) {
                throw new Error('Category not found');
            }

            return await Item.find({ category: categoryId })
                .sort({ name: 1 })
                .populate('category', 'name');
        } catch (error) {
            throw error;
        }
    }

    static async getAllItems() {
        try {
            return await Item.find().sort({ name: 1 }).populate('category', 'name');
        } catch (error) {
            throw error;
        }
    }
}