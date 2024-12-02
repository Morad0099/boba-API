import { ITopping } from '../models/topping.model';

export type CreateToppingDto = Pick<ITopping, 'name' | 'category' | 'price' | 'inStock'>;