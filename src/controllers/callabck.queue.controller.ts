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
  try {
    console.log("Processing callback queue transaction: ", job.data);
    const { data: transaction } = job;
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

// Enhanced error monitoring
transactionQueue.on("failed", (job, error) => {
  console.error("Job failed:", {
    jobId: job.id,
    transactionId: job.data._id,
    attempts: job.attemptsMade,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
});

transactionQueue.on("completed", (job) => {
  console.log("Job completed successfully:", {
    jobId: job.id,
    transactionId: job.data._id,
    timestamp: new Date().toISOString(),
  });
});

// Monitor stalled jobs
transactionQueue.on("stalled", (job) => {
  console.warn("Job stalled:", {
    jobId: job.id,
    transactionId: job.data._id,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down queue...");
  await transactionQueue.close();
  process.exit(0);
});

export default transactionQueue;
