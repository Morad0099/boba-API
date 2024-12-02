import { Topping } from '../models/topping.model';
import { Item } from '../models/item.model';
import type { CreateToppingDto } from '../types/topping.types';
import { Category } from '../models/category.model';

export class ToppingController {
    static async createTopping(data: CreateToppingDto) {
        try {
            // Verify category exists
            const item = await Category.findById(data.category);
            if (!item) {
                throw new Error('Category not found');
            }

            // Create topping
            const topping = new Topping(data);
            await topping.save();

            // Return populated topping
            const populatedTopping = await Topping.findById(topping._id)
                .populate('category', 'name');

            return populatedTopping;
        } catch (error) {
            throw error;
        }
    }

    static async getToppingsForItem(itemId: string) {
        try {
            // Verify item exists
            const item = await Category.findById(itemId);
            if (!item) {
                throw new Error('Category not found');
            }

            return await Topping.find({ category: itemId })
                .sort({ name: 1 })
                .populate('category', 'name');
        } catch (error) {
            throw error;
        }
    }

    static async getAllToppings() {
        try {
            return await Topping.find()
                .sort({ name: 1 })
                .populate('category', 'name');
        } catch (error) {
            throw error;
        }
    }
}