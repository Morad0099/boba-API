import { Order, OrderStatus } from "../models/order.model";
import { Transaction, TransactionStatus } from "../models/transaction.model";
import { OrderController } from "../controllers/order.controller";

class ReceiptSyncCron {
  private static isRunning = false;

  static async syncFailedReceipts() {
    // Prevent multiple runs
    if (this.isRunning) {
      console.log("Receipt sync already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("Starting receipt sync cron job");

    try {
      // Find confirmed orders without receipt IDs
      const failedOrders = await Order.find({
        status: OrderStatus.CONFIRMED,
        partnerReceiptId: { $exists: false },
      })
        .populate("customer")
        .populate("items.item")
        .limit(10); // Process in batches

      console.log(`Found ${failedOrders.length} orders to sync`);

      for (const order of failedOrders) {
        try {
          console.log(`Processing order: ${order._id}`);

          // Verify transaction status
          const transaction = await Transaction.findOne({
            order: order._id,
            status: TransactionStatus.SUCCESS,
          });

          if (!transaction) {
            console.warn(
              `No successful transaction found for order: ${order._id}`
            );
            continue;
          }

          // Create sales receipt
          await OrderController.createLoyverseReceipt(order);
        } catch (error) {
          console.error("Failed to resync order:", {
            orderId: order._id,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Update resync attempt count even on failure
          await order.updateOne({
            $set: {
              "metadata.lastResyncError":
                error instanceof Error ? error.message : "Unknown error",
              "metadata.lastResyncAttempt": new Date(),
            },
            $inc: { "metadata.resyncAttempts": 1 },
          });
        }

        // Add delay between orders to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Receipt sync cron job failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      this.isRunning = false;
      console.log("Receipt sync cron job completed");
    }
  }
}

export default ReceiptSyncCron;
