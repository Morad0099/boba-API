import { ITopping } from '../models/topping.model';

export type CreateToppingDto = Pick<ITopping, 'name' | 'item' | 'price' | 'inStock'>;