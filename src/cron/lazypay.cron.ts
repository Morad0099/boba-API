import Bull from "bull";
import $lazypay from "../doronpay/doronpay.util";
import { Transaction, TransactionStatus } from "../models/transaction.model";
import callbackQueue from "../controllers/callabck.queue.controller";

const transactionQueue = new Bull("pendingTransactions", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Set concurrency to 1 to process one at a time
transactionQueue.process(1, async (job) => {
  const transaction = job.data;

  try {
    const { paymentProviderRef } = transaction.metadata;
    console.log(`Processing transaction: ${paymentProviderRef}`);

    const lazyToken = await $lazypay.getToken();
    const response = await $lazypay.getStatus({
      id: paymentProviderRef,
      token: lazyToken,
    });

    const currentTransaction = await Transaction.findOne({
      "metadata.paymentProviderRef": response.transactionId,
    });

    if (!currentTransaction?._id) {
      throw new Error(`Transaction not found: ${response.transactionId}`);
    }

    const status =
      response.code === "00"
        ? TransactionStatus.SUCCESS
        : response.code === "02"
        ? TransactionStatus.FAILED
        : TransactionStatus.PENDING;

    await Transaction.findByIdAndUpdate(currentTransaction._id, {
      $set: {
        status,
        "metadata.paymentCallback": response,
        "metadata.lastChecked": new Date(),
        updatedAt: new Date(),
      },
    });

    if (status === TransactionStatus.SUCCESS) {
      console.log("Callback forwarding transaction to bull Queue: ", transaction._id);
      await callbackQueue.add(currentTransaction);
    }

    console.log(`Transaction ${response.transactionId} processed: ${status}`);
  } catch (error) {
    console.error("Transaction processing error:", {
      ref: transaction?.metadata?.paymentProviderRef,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
});

// Queue monitoring
transactionQueue.on("completed", (job) => {
  console.log(
    `✅ Completed transaction: ${job.data.metadata.paymentProviderRef}`
  );
});

transactionQueue.on("failed", (job, err) => {
  console.error(
    `❌ Failed transaction: ${job.data.metadata.paymentProviderRef}`,
    err
  );
});

transactionQueue.on("active", (job) => {
  console.log(
    `⚡ Starting transaction: ${job.data.metadata.paymentProviderRef}`
  );
});

const queuePendingTransactions = async (): Promise<void> => {
  try {
    const transactions = await Transaction.find({
      status: TransactionStatus.PENDING,
    });

    for (const transaction of transactions) {
      await transactionQueue.add(transaction, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      });
    }

    console.log(`Queued ${transactions.length} transactions`);
  } catch (error) {
    console.error("Error queuing transactions:", error);
  }
};

export default queuePendingTransactions;
