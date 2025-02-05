import cron from 'node-cron';
import axios from 'axios';
import { Category } from '../src/models/category.model';

const fetchCategories = async () => {
  try {
    const response = await axios.get('https://api.loyverse.com/v1.0/categories', {
      headers: {
        Authorization: `Bearer f48f9ca1de794c0e8d77b591bfc72807`,
      },
    });

    if (response.status === 200) {
      const categoriesData = response.data;

      if (Array.isArray(categoriesData.categories)) {
        const categories = categoriesData.categories;

        for (const category of categories) {
          const { id, name, color, created_at, deleted_at } = category;

          // Use upsert to avoid duplicate key error
          const existingCategory = await Category.updateOne(
            { name }, // Find by name
            { $set: { id, name, color, created_at, deleted_at } }, // Update fields
            { upsert: true } // If the category doesn't exist, create a new one
          );
          
          if (existingCategory.upsertedCount) {
            console.log(`Category ${name} created`);
          } else {
            console.log(`Category ${name} updated`);
          }
        }
      } else {
        console.error("Expected categories to be an array, but got:", categoriesData.categories);
      }
    } else {
      console.error("Error: Failed to fetch categories");
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

cron.schedule('0 * * * * *', fetchCategories); 
