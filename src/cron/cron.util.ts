import { cron } from "@elysiajs/cron";
import { Elysia } from "elysia";
import {
  syncCategories,
  syncCustomers,
  syncItems,
  syncStoreSettings,
} from "./category-cron";
import doronTransactionCron from "./lazypay.cron";

const initCron = () => {
  const app = new Elysia();

  // Main sync function
  const syncAll = async () => {
    try {
      console.log("Starting sync process...");

      // Using Promise.all for better performance while maintaining order
      await syncCategories();
      await syncItems();
      await syncCustomers();
      await syncStoreSettings();

      console.log("Sync process completed successfully");
    } catch (error) {
      console.error("Error in sync process:", error);
      // Add your error reporting service here
    }
  };

  const initTransactionCron = async () => {
    try {
      console.log("Starting transaction cron...");
      await doronTransactionCron();
    } catch (err) {
      console.error("Error in transaction process:", err);
      // Add your error reporting service here
    }
  };

  // Add cron jobs using Elysia cron plugin
  app.use(
    cron({
      name: "sync-all",
      pattern: "0 * * * * *", // Every minute
      run: syncAll,
    })
  );

  app.use(
    cron({
      name: "transaction-sync",
      pattern: "*/5 * * * * *", // Every 5 seconds
      run: initTransactionCron,
    })
  );

  // Error handling for the Elysia app
  app.onError(({ code, error }) => {
    console.error(`Elysia error (${code}):`, error);
    // Add your error reporting service here
  });

  // Start the server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Cron server running on port ${port}`);
  });

  return app;
};

export default initCron;
