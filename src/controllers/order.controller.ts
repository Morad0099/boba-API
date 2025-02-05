import { Order, OrderStatus } from "../models/order.model";
import {
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
  OrderResponse,
  OrderResponseWithMessage,
} from "../types/order.types";
import { transformOrderToResponse } from "../utils/order.utils";
import { Topping } from "../models/topping.model";
import { SMSService } from "../services/sms.service";
import { Admin } from "../models/admin.model";
import $loyverseConfig from "../loyverse/loyverse.config";
import $loyverse from "../loyverse/loyverse.request";
import $loyverseUtils from "../loyverse/loyverse.utils";

// LazyPay API integration
const LAZYPAY_BASE_URL = "https://doronpay.com/api";
const MERCHANT_ID = "63dcd6fbf7f60ec473d09885";
const API_KEY = "453189c4-f902-4989-8fbb-d6ee20003595";
const CALLBACK_URL = "http://18.133.83.229:8021/api/orders/callback";

class LazyPayAPI {
  static async getToken(operation = "DEBIT"): Promise<string> {
    const response = await fetch(`${LAZYPAY_BASE_URL}/hub/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: MERCHANT_ID,
        apikey: API_KEY,
        operation,
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  }

  static async initiatePayment(
    data: {
      amount: number;
      account_number: string;
      account_name: string;
      account_issuer: string;
      description: string;
      externalTransactionId: string;
    },
    token: string
  ) {
    const response = await fetch(`${LAZYPAY_BASE_URL}/hub/debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        callbackUrl: CALLBACK_URL,
        amount: Number(data.amount).toFixed(2),
        account_issuer: data.account_issuer.toLowerCase(),
      }),
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result;
  }
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
  static async handleCallback(req: Request): Promise<any> {
    try {
      const { code, transactionId } = req.body as any;

      // Find transaction
      const transaction = await Transaction.findOne({
        "metadata.paymentProviderRef": transactionId,
      });

      if (!transaction) {
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
          "metadata.paymentCallback": req.body,
          updatedAt: new Date(),
        },
      });

      // If payment successful, update order and send notifications
      if (status === TransactionStatus.SUCCESS) {
        const order = await Order.findById(transaction.order)
          .populate("customer")
          .populate("items.item");

        if (!order) {
          throw new Error("Order not found");
        }

        // Update order status
        await order.updateOne({
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        });

        try {
          const line_items = await Promise.all(
            order.items.map(async (item) => {
              const [itemDetails, toppingDetails] = await Promise.all([
                Item.findById(item.item),
                Topping.findById(item.toppings),
              ]);
              return {
                variant_id: itemDetails?.partnerItemId,
                quantity: item.quantity,
                price: item.price,
                line_modifiers: item.toppings.map((topping) => ({
                  modifier_option_id: toppingDetails?.partnerToppingsId,
                  price: topping.price,
                })),
              };
            })
          );
          const address = await Address.findById(order.deliveryAddress);
          const store_id = await $loyverseUtils.getStoreId();
          const payment_type_id = await $loyverseUtils.getPaymentMethodId(
            "momo"
          );
          // Create sales receipt in Loyverse
          const salesReceipt = {
            store_id: store_id,
            order: order.orderNumber, // Your order reference
            customer_id: (order.customer as ICustomer)?.partnerCustomerId,
            source: "BobaApp",
            receipt_date: new Date().toISOString(),
            line_items: line_items,
            note: `Delivery Address: ${address?.streetAddress}, ${address?.city}`,
            payments: [
              {
                payment_type_id: payment_type_id,
                paid_at: new Date().toISOString(),
              },
            ],
          };

          const loyverseResponse = await $loyverse.createSalesReceipt(
            salesReceipt
          );

          // Store Loyverse receipt ID in our order
          await order.updateOne({
            $set: {
              partnerReceiptId: loyverseResponse.receipt_number,
              partnerReceiptData: loyverseResponse,
            },
          });
        } catch (loyverseError) {
          console.error(
            "Failed to create sales receipt in Loyverse:",
            loyverseError
          );
          // Log error but don't throw - we still want to return the order to customer
        }

        // Send notifications
        try {
          await this.sendNotifications(order, transaction);
        } catch (err) {
          console.log("Error sending payment notification: ", err);
        }
      } else if (status === TransactionStatus.FAILED) {
        // Handle failed payment
        await Order.findByIdAndUpdate(transaction.order, {
          status: OrderStatus.CANCELLED,
          updatedAt: new Date(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Payment callback error:", error);
      throw error;
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
