import { Category } from "../models/category.model";
import $loyverse from "../loyverse/loyverse.request";
import { Item } from "../models/item.model";
import { Customer } from "../models/customer.model";
import dbStoreSettings from "../loyverse/loyverse.store-settings.db";
import { Order, OrderStatus } from "../models/order.model";
import moment from "moment";

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

interface LoyverseReceipt {
  id: string;
  status: string;
  // Add other receipt properties
}

const syncOrderStatuses = async () => {
  try {
    // Get all pending orders with Loyverse receipt IDs
    const pendingOrders = await Order.find({
      partnerReceiptId: { $exists: true },
      status: {
        $in: [
          OrderStatus.PENDING,
          OrderStatus.PROCESSING,
          OrderStatus.CONFIRMED,
        ],
      },
    });

    if (!pendingOrders.length) {
      return;
    }

    console.log(`Checking status for ${pendingOrders.length} pending orders`);

    // Update each order's status
    await Promise.all(
      pendingOrders.map(async (order) => {
        try {
          // Fetch receipt from Loyverse
          const receipt = await $loyverse.getReceiptStatus(
            order.partnerReceiptId
          );

          if (!receipt) {
            console.warn(`Receipt not found for order ${order._id}`);
            return;
          }

          let newStatus: OrderStatus | undefined;

          // Map Loyverse status to your app's status
          if (moment(receipt.cancelled_at).isValid()) {
            newStatus = OrderStatus.CANCELLED;
          }

          if (newStatus && newStatus !== order.status) {
            await Order.updateOne(
              { _id: order._id },
              {
                $set: {
                  status: newStatus,
                  partnerReceiptData: receipt,
                  updatedAt: new Date(),
                },
              }
            );

            console.log(`Updated order ${order._id} status to ${newStatus}`);

            // Optionally notify customer about status change
            // await notifyCustomer(order._id, newStatus);
          }
        } catch (error) {
          console.error(`Error syncing order ${order._id}:`, error);
        }
      })
    );
  } catch (error) {
    console.error("Error in order status sync:", error);
    throw error;
  }
};

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
    await Category.deleteMany({});

    const { categories } = await $loyverse.fetchCategories();

    if (!Array.isArray(categories)) {
      throw new Error("Expected categories to be an array");
    }

    const results = await Promise.all(
      categories.map(async (category: LoyverseCategory) => {
        // First check if category exists by partnerCategoryId
        const existingCategory = await Category.findOne({
          partnerCategoryId: category.id,
        });

        // If it exists, do an update
        if (existingCategory) {
          const result = await Category.findOneAndUpdate(
            { partnerCategoryId: category.id },
            {
              $set: {
                name: category.name,
                color: category.color,
                createdAt: category.created_at,
                deleted_at: category.deleted_at,
              },
            },
            { new: true }
          );
          console.log(`Category ${category.name} updated`);
          return result;
        }

        // If it doesn't exist, create new
        const result = await Category.create({
          partnerCategoryId: category.id,
          name: category.name,
          color: category.color,
          createdAt: category.created_at,
          deleted_at: category.deleted_at,
        });

        console.log(`Category ${category.name} created`);
        return result;
      })
    );

    console.log(`Successfully synced ${results.length} categories`);
    return results;
  } catch (error) {
    console.info("Error processing categories:", error);
    throw error;
  }
};

export {
  syncCategories,
  syncItems,
  syncCustomers,
  syncStoreSettings,
  syncOrderStatuses,
};
