import cron from "node-cron";
import { Category } from "../models/category.model";
import $loyverse from "../loyverse/loyverse.request";
import { Item } from "../models/item.model";
import { Customer } from "../models/customer.model";
import dbStoreSettings from "../loyverse/loyverse.store-settings.db";

// Types
interface LoyverseVariant {
  cost: number;
}

interface LoyverseItem {
  id: string;
  category_id: string;
  item_name: string;
  color: string;
  description: string;
  created_at: string;
  variants: LoyverseVariant[];
}

interface LoyverseCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
  deleted_at?: string;
}

interface LoyverseCustomer {
  id: string;
  [key: string]: any; // Add specific fields as needed
}

const syncStoreSettings = async () => {
  try {
    // Fetch latest settings from Loyverse
    const { paymentData, storeData } = await $loyverse.getStoreSettings();

    const settingsData = {
      paymentMethods: paymentData,
      stores: storeData,
    };

    // Find existing settings or create new
    const result = await dbStoreSettings.findOneAndUpdate(
      {}, // Empty filter to match any document
      { $set: settingsData },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Store settings ${result._id ? "updated" : "created"}`);

    return result;
  } catch (error) {
    console.error("Failed to sync store settings:", error);
    throw error;
  }
};

// Sync functions
const syncCustomers = async () => {
  try {
    const { customers } = await $loyverse.fetchCustomers();

    if (!Array.isArray(customers)) {
      throw new Error("Expected customers to be an array");
    }

    const results = await Promise.all(
      customers.map(async (customer: LoyverseCustomer) => {
        try {
          const result = await Customer.updateOne(
            { partnerCustomerId: customer.id },
            { $set: customer },
            { upsert: true }
          );

          console.log(
            `Customer ${customer.id} ${
              result.upsertedCount ? "created" : "updated"
            }`
          );
          return result;
        } catch (error) {
          console.error(`Error syncing customer ${customer.id}:`, error);
          throw error;
        }
      })
    );

    console.log(`Successfully synced ${results.length} customers`);
    return results;
  } catch (error) {
    console.error("Error in customer sync:", error);
    throw error;
  }
};

const syncItems = async () => {
  try {
    const { items } = await $loyverse.fetchItems();

    if (!Array.isArray(items)) {
      throw new Error("Expected items to be an array");
    }

    const results = await Promise.all(
      items.map(async (item: LoyverseItem) => {
        const category = await Category.findOne({
          partnerCategoryId: item.category_id,
        });

        // Clean description by removing HTML tags
        const cleanDescription =
          item.description?.replace(/<[^>]*>/g, "") || "";

        const baseItem = {
          name: item.item_name,
          partnerItemId: item.id,
          description: cleanDescription,
          createdAt: item.created_at,
          color: item.color,
          category: category?._id ?? null,
        };

        const variantResults = await Promise.all(
          item.variants.map((variant) =>
            Item.findOneAndUpdate(
              { partnerItemId: item.id },
              { $set: { ...baseItem, price: variant.cost } },
              { upsert: true, new: true }
            )
          )
        );

        console.log(
          `Item ${item.item_name} synced with ${variantResults.length} variants`
        );
        return variantResults;
      })
    );

    console.log(`Successfully synced ${results.length} items`);
    return results;
  } catch (error) {
    console.error("Error processing items:", error);
    throw error;
  }
};

const syncCategories = async () => {
  try {
    const { categories } = await $loyverse.fetchCategories();

    if (!Array.isArray(categories)) {
      throw new Error("Expected categories to be an array");
    }

    const results = await Promise.all(
      categories.map(async (category: LoyverseCategory) => {
        const result = await Category.updateOne(
          { partnerCategoryId: category.id },
          {
            $set: {
              name: category.name,
              color: category.color,
              createdAt: category.created_at,
              deleted_at: category.deleted_at,
              partnerCategoryId: category.id,
            },
          },
          { upsert: true }
        );

        console.log(
          `Category ${category.name} ${
            result.upsertedCount ? "created" : "updated"
          }`
        );
        return result;
      })
    );

    console.log(`Successfully synced ${results.length} categories`);
    return results;
  } catch (error) {
    console.error("Error processing categories:", error);
    throw error;
  }
};

// Main sync function
const syncAll = async () => {
  try {
    console.log("Starting sync process...");

    // Sync in order: categories first, then items, then customers
    await syncCategories();
    await syncItems();
    await syncCustomers();
    await syncStoreSettings();

    console.log("Sync process completed successfully");
  } catch (error) {
    console.error("Error in sync process:", error);
  }
};

// Schedule sync every minute
cron.schedule("0 * * * * *", syncAll);
export { syncCategories, syncItems, syncCustomers, syncStoreSettings, syncAll };
