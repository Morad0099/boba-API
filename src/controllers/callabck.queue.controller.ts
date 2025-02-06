import Bull from "bull";
import { OrderController } from "../controllers/order.controller";

// Create a new Bull Queue specifically for transaction callbacks
const transactionQueue = new Bull("callbackQueue", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Job processing configuration
transactionQueue.process(async (job) => {
  const { data: transaction } = job;
  try {
    // Process the transaction
    await OrderController.processOrderCallback(transaction?._id);
    return null;
  } catch (error) {
    // Log the error
    console.error("Transaction processing failed:", error);
    // Optionally, you can add custom retry logic
    throw error;
  }
});

// Optional: Configure global queue events for monitoring
transactionQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err}`);
});

// Optional: Middleware for additional logging or preprocessing
transactionQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

export default transactionQueue;
