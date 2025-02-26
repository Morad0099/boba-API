import { IOrder, Order, OrderStatus } from "../models/order.model";
import {
  ITransaction,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../models/transaction.model";
import { Item } from "../models/item.model";
import { Address } from "../models/address.model";
import { PaymentNumber } from "../models/payment-number.model";
import { Customer, ICustomer } from "../models/customer.model";
import type {
  CreateOrderDto,
  OrderResponseWithMessage,
} from "../types/order.types";
import { transformOrderToResponse } from "../utils/order.utils";
import { Topping } from "../models/topping.model";
import { SMSService } from "../services/sms.service";
import $loyverse from "../loyverse/loyverse.request";
import $loyverseUtils from "../loyverse/loyverse.utils";
import LazyPayAPI from "../doronpay/doronpay.util";
import callbackQueue from "./callabck.queue.controller";

interface PaymentCallbackBody {
  code: string;
  transactionId: string;
  [key: string]: any;
}

export class OrderController {
  static async createOrder(
    customerId: string,
    data: CreateOrderDto
  ): Promise<OrderResponseWithMessage> {
    try {
      // Validate delivery address
      const address = await Address.findOne({
        _id: data.deliveryAddressId,
        customer: customerId,
      });

      if (!address) {
        throw new Error("Invalid delivery address");
      }

      // Validate payment number
      const paymentNumber = await PaymentNumber.findOne({
        _id: data.paymentNumberId,
        customer: customerId,
      });

      if (!paymentNumber) {
        throw new Error("Invalid payment number");
      }

      // Get customer details
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Calculate order items and total
      const orderItems = await Promise.all(
        data.items.map(async (item) => {
          const productItem = await Item.findById(item.itemId);
          if (!productItem) {
            throw new Error(`Item not found: ${item.itemId}`);
          }

          // Fetch and calculate toppings
          const toppings = await Promise.all(
            (item.toppings || []).map(async (toppingId: string) => {
              const topping = await Topping.findById(toppingId);
              if (!topping) {
                throw new Error(`Topping not found: ${toppingId}`);
              }
              return {
                topping: topping._id,
                price: topping.price,
              };
            })
          );

          console.log("Toppings for item:", productItem.name, toppings);

          const toppingsTotal = toppings.reduce((sum, t) => sum + t.price, 0);
          const subtotal =
            productItem.price * item.quantity + toppingsTotal * item.quantity;

          console.log("Subtotal for item:", productItem.name, subtotal);

          return {
            item: productItem._id,
            quantity: item.quantity,
            price: productItem.price,
            subtotal,
            toppings,
          };
        })
      );

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );

      // Create the order
      const order = new Order({
        customer: customerId,
        items: orderItems,
        totalAmount,
        deliveryAddress: address._id,
        paymentNumber: paymentNumber._id,
        status: OrderStatus.PENDING,
      });

      await order.save();

      // Create transaction
      const transaction = new Transaction({
        order: order._id,
        amount: totalAmount,
        type: TransactionType.MOBILE_MONEY,
        status: TransactionStatus.PENDING,
        metadata: {
          paymentNumber: paymentNumber.number,
          provider: paymentNumber.provider,
          customerName: customer.name,
          customerPhone: customer.phone_number,
        },
      });

      await transaction.save();

      // Initiate mobile money payment
      try {
        const token = await LazyPayAPI.getToken();
        const paymentResponse = await LazyPayAPI.initiatePayment(
          {
            amount: totalAmount,
            account_number: paymentNumber.number,
            account_name: customer.name,
            account_issuer: paymentNumber.provider,
            description: `Payment for order ${order.orderNumber}`,
            externalTransactionId: transaction.transactionReference,
          },
          token
        );

        // Update transaction with payment provider response
        await transaction.updateOne({
          $set: {
            "metadata.paymentProviderRef": paymentResponse.transactionId,
            "metadata.paymentStatus":
              paymentResponse.code === "01" ? "INITIATED" : "FAILED",
            "metadata.paymentResponse": paymentResponse,
          },
        });

        // Return order with populated fields
        const populatedOrder = await Order.findById(order._id)
          .populate("items.item", "name price")
          .populate("items.toppings", "name price")
          .populate("deliveryAddress", "streetAddress city region landmark")
          .populate("paymentNumber", "number provider")
          .populate("customer", "name phone");

        if (!populatedOrder) {
          throw new Error("Failed to populate order");
        }

        // Prepare response message based on provider
        const paymentMessage =
          paymentNumber.provider.toLowerCase() === "mtn"
            ? "Transaction Pending. Kindly dial *170#, select 6) Wallet, Choose 3) My Approvals and enter MM PIN to approve payment immediately."
            : `Transaction Pending. A message has been sent to your mobile phone for the deduction of GHS${totalAmount}, Please enter your pin to confirm.`;

        const orderResponse = transformOrderToResponse(
          populatedOrder,
          {
            transactionReference: transaction.transactionReference,
            status: transaction.status,
            message: paymentMessage,
          },
          paymentMessage
        );

        return orderResponse;
      } catch (error: any) {
        // If payment initiation fails, update order and transaction status
        await order.updateOne({ status: OrderStatus.CANCELLED });
        await transaction.updateOne({ status: TransactionStatus.FAILED });
        throw new Error(`Payment initiation failed: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }
  }

  // Add callback handler for payment provider webhook
  static async handleCallback(body: PaymentCallbackBody) {
    try {
      // 1. Parse and validate request - no need to parse JSON anymore
      if (!body?.code || !body?.transactionId) {
        return {
          success: false,
          error: "Invalid callback: missing code or transactionId",
        };
      }

      console.log("Payment callback received:", {
        transactionId: body.transactionId,
        code: body.code,
      });

      // Rest of your code remains the same...
      const transaction = await Transaction.findOne({
        "metadata.paymentProviderRef": body.transactionId,
      });

      if (!transaction) {
        console.error(`Transaction not found: ${body.transactionId}`);
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      const status =
        body.code === "00"
          ? TransactionStatus.SUCCESS
          : body.code === "02"
          ? TransactionStatus.FAILED
          : TransactionStatus.PENDING;

      await Transaction.findByIdAndUpdate(transaction._id, {
        $set: {
          status,
          "metadata.paymentCallback": body,
          "metadata.lastProcessedAt": new Date(),
          updatedAt: new Date(),
        },
      });

      if (status === TransactionStatus.SUCCESS) {
        try {
          console.log(
            "Forwarding transaction to bull Queue: ",
            transaction._id
          );
          // await callbackQueue.add(transaction);
          await OrderController.processOrderCallback(transaction._id as string);
        } catch (err) {
          console.error("Order processing failed:", {
            transactionId: body.transactionId,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        status,
        transactionId: body.transactionId,
      };
    } catch (error) {
      console.error("Payment callback error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        body,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private static async sendNotifications(order: any, transaction: any) {
    try {
      // Customer notification
      const customerMessage = `Payment confirmed: ${transaction.transactionReference}. Amount: GHS ${transaction.amount}. Your order #${order.orderNumber} has been received and is being processed. Thank you!`;

      if (order.customer?.phone) {
        await SMSService.sendSMS(customerMessage, order.customer.phone);
      }

      // Admin notification
      // const admins = await Admin.find({ active: true });
      // const adminPhones = admins.map(admin => admin.phone).filter(Boolean);

      // if (adminPhones.length > 0) {
      //     const adminMessage = `New order #${order.orderNumber} received! Amount: GHS ${transaction.amount}. Customer: ${order.customer?.name || 'N/A'}`;
      //     await SMSService.sendSMS(adminMessage, adminPhones);
      // }
    } catch (error) {
      console.error("Notification error:", error);
      // Don't throw error here to prevent callback failure
    }
  }

  static async getOrdersByCustomer(customerId: string) {
    try {
      const orders = await Order.find({ customer: customerId })
        .populate("items.item", "name price")
        .populate("deliveryAddress", "streetAddress city region landmark")
        .populate("paymentNumber", "number provider")
        .sort({ createdAt: -1 });

      const ordersWithTransactions = await Promise.all(
        orders.map(async (order) => {
          const transaction = await Transaction.findOne({
            order: order._id,
          }).select("transactionReference status");

          return {
            ...order.toObject(),
            transaction: transaction,
          };
        })
      );

      return ordersWithTransactions;
    } catch (error) {
      throw error;
    }
  }

  static async getOrderDetails(orderId: string, customerId: string) {
    try {
      const order = await Order.findOne({ _id: orderId, customer: customerId })
        .populate("items.item", "name price")
        .populate("deliveryAddress", "streetAddress city region landmark")
        .populate("paymentNumber", "number provider")
        .populate({
          path: "customer",
          select: "name phone",
        });

      if (!order) {
        throw new Error("Order not found");
      }

      const transaction = await Transaction.findOne({
        order: order._id,
      }).select("transactionReference status");

      return {
        ...order.toObject(),
        transaction,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getAllOrders() {
    try {
      return await Order.find()
        .sort({ createdAt: -1 })
        .populate("customer")
        .populate("items.item"); // This will populate the item details
    } catch (error) {
      throw error;
    }
  }

  static async createLoyverseReceipt(order: IOrder) {
    console.log("Starting Loyverse receipt creation for order:", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customer,
    });

    try {
      // Log items before processing
      console.log("Processing order items:", {
        orderId: order._id,
        itemCount: order.items.length,
        items: order.items.map((item) => ({
          itemId: item.item,
          quantity: item.quantity,
          toppingsCount: item.toppings?.length || 0,
        })),
      });

      // Get all item details and topping details in parallel
      const line_items = await Promise.all(
        order.items.map(async (item, index) => {
          console.log(`Processing item ${index + 1}/${order.items.length}:`, {
            itemId: item.item,
            toppingsCount: item.toppings?.length || 0,
          });

          try {
            const [itemDetails, toppingDetails] = await Promise.all([
              Item.findById(item.item),
              Promise.all(
                item.toppings.map(async (t, tIndex) => {
                  const topping = await Topping.findById(t.topping);
                  if (!topping) {
                    console.warn(`Topping not found:`, {
                      orderId: order._id,
                      itemIndex: index,
                      toppingId: t.topping,
                    });
                  }
                  return topping;
                })
              ),
            ]);

            if (!itemDetails) {
              console.error(`Item not found:`, {
                orderId: order._id,
                itemId: item.item,
              });
            }

            console.log(`Item details retrieved:`, {
              itemId: item.item,
              partnerItemId: itemDetails?.partnerItemId,
              toppingsFound: toppingDetails.filter(Boolean).length,
            });

            return {
              variant_id: itemDetails?.parnterVarientId,
              quantity: item.quantity,
              price: item.price,
              line_modifiers: item.toppings.map((topping, index) => {
                const modifier = {
                  modifier_option_id: toppingDetails[index]?.partnerToppingsId,
                  price: topping.price,
                };
                console.log(`Topping modifier created:`, {
                  toppingId: topping.topping,
                  partnerId: modifier.modifier_option_id,
                  price: modifier.price,
                });
                return modifier;
              }),
            };
          } catch (error) {
            console.error(`Failed to process item:`, {
              orderId: order._id,
              itemId: item.item,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
          }
        })
      );

      console.log("Line items processed successfully:", {
        orderId: order._id,
        lineItemsCount: line_items.length,
      });

      // Get additional required data
      console.log("Fetching additional data...");
      const [address, store_id, payment_type_id] = await Promise.all([
        Address.findById(order.deliveryAddress),
        $loyverseUtils.getStoreId(),
        $loyverseUtils.getPaymentMethodId("momo"),
      ]).catch((error) => {
        console.error("Failed to fetch additional data:", {
          orderId: order._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      });

      console.log("Additional data retrieved:", {
        orderId: order._id,
        hasAddress: !!address,
        storeId: store_id,
        paymentTypeId: payment_type_id,
      });

      // Create sales receipt
      const salesReceipt = {
        store_id,
        order: order.orderNumber,
        customer_id: (order.customer as ICustomer)?.partnerCustomerId,
        source: "BobaApp",
        receipt_date: new Date().toISOString(),
        line_items,
        note: `Delivery Address: ${address?.streetAddress}, ${address?.city}`,
        payments: [
          {
            payment_type_id,
            paid_at: new Date().toISOString(),
          },
        ],
      };

      console.log("Prepared Loyverse sales receipt:", {
        orderId: order._id,
        receipt: {
          ...salesReceipt,
          line_items: `${salesReceipt.line_items.length} items`,
        },
      });

      // Save receipt payload
      await order.updateOne({
        $set: {
          partnerReceiptPayload: salesReceipt,
        },
      });

      console.log("Sending receipt to Loyverse...", {
        orderId: order._id,
      });

      // Send to Loyverse and update order
      const loyverseResponse = await $loyverse.createSalesReceipt(salesReceipt);

      console.log("Loyverse response received:", {
        orderId: order._id,
        receiptNumber: loyverseResponse.receipt_number,
        responseStatus: loyverseResponse.status,
      });

      await order.updateOne({
        $set: {
          partnerReceiptId: loyverseResponse.receipt_number,
          partnerReceiptData: loyverseResponse,
        },
      });

      console.log("Receipt creation completed successfully:", {
        orderId: order._id,
        receiptNumber: loyverseResponse.receipt_number,
      });
    } catch (error) {
      console.error("Loyverse integration failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        orderId: order._id,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString(),
      });

      // Re-throw the error to be handled by the caller
      throw error;
    }
  }

  static async processOrderCallback(transactionId: string) {
    try {
      // 1. Get transaction
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      // 2. Process based on transaction status
      if (transaction.status === TransactionStatus.SUCCESS) {
        // Get order with populated fields
        const order = await Order.findById(transaction.order)
          .populate("customer")
          .populate("items.item");

        if (!order) {
          throw new Error(`Order not found for transaction: ${transactionId}`);
        }

        if (order.status === OrderStatus.CONFIRMED) {
          throw Error("Order already processed");
        }

        // Update order status first
        await order.updateOne({
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        });

        // Process Loyverse integration
        try {
          await OrderController.createLoyverseReceipt(order);
        } catch (err) {
          console.log(err);
        }
        // Send notifications
        try {
          await this.sendNotifications(order, transaction);
        } catch (error) {
          console.error("Notification sending failed:", {
            error: error instanceof Error ? error.message : "Unknown error",
            orderId: order._id,
            transactionId,
          });
          // Don't throw - notifications are non-critical
        }
      } else if (transaction.status === TransactionStatus.FAILED) {
        // Handle failed payment
        await Order.findByIdAndUpdate(transaction.order, {
          status: OrderStatus.CANCELLED,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.info("Order callback processing failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        transactionId,
      });
      throw error; // Re-throw for the queue to handle
    }
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status } },
        { new: true }
      )
        .populate("customer")
        .populate("items.item");

      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }
}
