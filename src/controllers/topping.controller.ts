import { Topping } from '../models/topping.model';
import { Item } from '../models/item.model';
import type { CreateToppingDto } from '../types/topping.types';

export class ToppingController {
    static async createTopping(data: CreateToppingDto) {
        try {
            // Verify item exists
            const item = await Item.findById(data.item);
            if (!item) {
                throw new Error('Item not found');
            }

            // Create topping
            const topping = new Topping(data);
            await topping.save();

            // Return populated topping
            const populatedTopping = await Topping.findById(topping._id)
                .populate('item', 'name');

            return populatedTopping;
        } catch (error) {
            throw error;
        }
    }

    static async getToppingsForItem(itemId: string) {
        try {
            // Verify item exists
            const item = await Item.findById(itemId);
            if (!item) {
                throw new Error('Item not found');
            }

            return await Topping.find({ item: itemId })
                .sort({ name: 1 })
                .populate('item', 'name');
        } catch (error) {
            throw error;
        }
    }

    static async getAllToppings() {
        try {
            return await Topping.find()
                .sort({ name: 1 })
                .populate('item', 'name');
        } catch (error) {
            throw error;
        }
    }
}