import { Category } from "../models/category.model";
import type { CreateCategoryDto } from "../types/category.types";

export class CategoryController {
  static async createCategory(data: CreateCategoryDto) {
    try {
      const existingCategory = await Category.findOne({ name: data.name });
      if (existingCategory) {
        throw new Error("Category with this name already exists");
      }
      const category = new Category(data);
      await category.save();
      return category;
    } catch (error) {
      throw error;
    }
  }

  static async deleteCategory(id: string) {
    try {
      const category = await Category.findById(id);
      if (!category) {
        throw new Error("Category not found");
      }

      await Category.findByIdAndDelete(id);
      return { message: "Category deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  static async getAllCategories() {
    try {
      return await Category.find().sort({ name: 1 });
    } catch (error) {
      throw error;
    }
  }

  static async getCategoryById(id: string) {
    try {
      const category = await Category.findById(id);
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    } catch (error) {
      throw error;
    }
  }
}
