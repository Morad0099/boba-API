import $lazypay from "../doronpay/doronpay.util";
import Bull from "bull";
import { Transaction, TransactionStatus } from "../models/transaction.model";
import { OrderController } from "../controllers/order.controller";

// Create a queue for processing transactions
const transactionQueue = new Bull("pendingTransactions", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Define the job processor
transactionQueue.process(1, async (job) => {
  const ref = job.data;
  try {
    const { paymentProviderRef } = ref.metadata;

    const lazyToken = await $lazypay.getToken();
    const response = await $lazypay.getStatus({
      id: paymentProviderRef,
      token: lazyToken,
    });

    const { code, transactionId } = response;

    // Find transaction
    const transaction = await Transaction.findOne({
      "metadata.paymentProviderRef": transactionId,
    });

    if (!transaction?._id) {
      throw new Error("Transaction not found");
    }

    // Map payment provider status to your status
    let status: TransactionStatus;
    switch (code) {
      case "00":
        status = TransactionStatus.SUCCESS;
        break;
      case "02":
        status = TransactionStatus.FAILED;
        break;
      default:
        status = TransactionStatus.PENDING;
        break;
    }

    // Update transaction
    await transaction.updateOne({
      $set: {
        status,
        "metadata.paymentCallback": response,
        updatedAt: new Date(),
      },
    });

    // Handle the response
    await OrderController.processOrderCallback(transaction._id as string);
  } catch (error: any) {
    console.error(
      `Error processing transaction ${ref.transactionRef}: ${error.message}`
    );
    throw error; // Allow the job to retry if enabled
  }
});

const pending = async (): Promise<void> => {
  try {
    console.log("Fetching pending transactions...");
    const transactions = await Transaction.find({
      status: TransactionStatus.PENDING,
    });

    // Add each transaction to the queue
    for (const transaction of transactions) {
      transactionQueue.add(transaction, {
        attempts: 1, // Retry the job up to 3 times if it fails
        backoff: 5000, // Wait 5 seconds before retrying
        removeOnComplete: true, // Automatically remove job after it completes
        removeOnFail: true, // Automatically remove job after it fails
      });
    }

    console.log(`${transactions.length} transactions queued for processing.`);
  } catch (error: any) {
    console.error(`Error queuing pending transactions: ${error.message}`);
  }
};

export default pending;
