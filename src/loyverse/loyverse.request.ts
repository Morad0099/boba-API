import fetch from "node-fetch";
import config from "./loyverse.config";

interface StoreResponse {
  stores: Array<{
    id: string;
    name: string;
    // Add other store properties
  }>;
}

interface PaymentResponse {
  payment_types: Array<{
    id: string;
    name: string;
    // Add other payment type properties
  }>;
}

const getStoreSettings = async () => {
  try {
    const endpoints = {
      stores: `${config.baseUrl}/stores`,
      payments: `${config.baseUrl}/payment_types`,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };

    const fetchOptions = { headers };

    const [storeResponse, paymentResponse] = await Promise.all([
      fetch(endpoints.stores, fetchOptions),
      fetch(endpoints.payments, fetchOptions),
    ]);

    if (!storeResponse.ok) {
      throw new Error(`Store API Error: ${storeResponse.statusText}`);
    }

    if (!paymentResponse.ok) {
      throw new Error(`Payment API Error: ${paymentResponse.statusText}`);
    }

    const { stores }: StoreResponse = await storeResponse.json();
    const { payment_types }: PaymentResponse = await paymentResponse.json();

    return {
      storeData: stores,
      paymentData: payment_types,
    };
  } catch (error) {
    console.error("Failed to fetch store settings:", error);
    throw error;
  }
};

// Type definition for the response
interface LoyverseCustomerResponse {
  id: string;
  [key: string]: any;
}

// Create customer in Loyverse function
async function createLoyverseCustomer(customer: any) {
  try {
    console.log("Preparing customer data for Loyverse:", {
      customerId: customer._id,
      name: customer.name,
      email: customer.email,
    });

    const thirdPartyPayload = {
      name: customer.name || "Unknown",
      email: customer.email,
      phone_number: customer.phone_number?.replace(/\s+/g, ""),
      address: customer.address?.trim(),
      city: customer.city?.trim(),
      region: customer.region?.trim(),
      postal_code: customer.postal_code?.trim(),
      country_code: customer.country_code?.toUpperCase(),
      customer_code: customer.customer_code,
      note: customer.note?.trim(),
      total_points: Math.max(0, parseInt(customer.total_points) || 0),
    };

    console.log("Sending request to Loyverse:", {
      customerId: customer._id,
      url: `${config.baseUrl}/customers`,
      payload: thirdPartyPayload,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${config.baseUrl}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(thirdPartyPayload),
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    console.log("Received response from Loyverse:", {
      customerId: customer._id,
      status: response.status,
      responseId: responseData?.id,
    });

    if (response.ok) {
      return responseData;
    } else if (response.status === 409) {
      throw new Error("Customer already exists in Loyverse");
    } else if (response.status === 422) {
      throw new Error(`Validation error: ${JSON.stringify(responseData)}`);
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else {
      throw new Error(
        `Failed to register customer in Loyverse. Status: ${
          response.status
        }, Message: ${responseData?.message || "Unknown error"}`
      );
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Loyverse request timed out:", {
        customerId: customer._id,
        error: "Request timed out after 10 seconds",
      });
      throw new Error("Connection to Loyverse timed out");
    }

    console.error("Failed to create customer in Loyverse:", {
      customerId: customer._id,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

const getReceiptStatus = async (receipt_number: string) => {
  try {
    const url: string = `${config.baseUrl}/receipts/${receipt_number}`;
    const options = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      headers: options,
    });
    if (!response.ok) {
      throw Error(response.statusText);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw err;
  }
};

interface LoyverseReceipt {
  receipt_number: string;
  status?: string;
  [key: string]: any;
}

const createSalesReceipt = async (payload: any) => {
  try {
    console.log("Creating sales receipt in Loyverse:", {
      orderNumber: payload.order,
      customerId: payload.customer_id,
      items: payload.line_items?.length || 0,
    });

    const url = `${config.baseUrl}/receipts`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    console.log("Received response from Loyverse:", {
      status: response.status,
      orderNumber: payload.order,
      receiptNumber: responseData?.receipt_number,
    });

    if (response.ok) {
      return responseData as LoyverseReceipt;
    }

    // Handle specific error cases
    if (response.status === 400) {
      throw new Error(`Invalid receipt data: ${JSON.stringify(responseData)}`);
    } else if (response.status === 422) {
      throw new Error(`Validation error: ${JSON.stringify(responseData)}`);
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    throw new Error(
      `Failed to create receipt. Status: ${response.status}, Message: ${
        responseData?.message || response.statusText || "Unknown error"
      }`
    );
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Receipt creation timed out:", {
        orderNumber: payload.order,
        timeout: "15 seconds",
      });
      throw new Error("Receipt creation request timed out");
    }

    console.error("Failed to create receipt:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      orderNumber: payload.order,
      customerId: payload.customer_id,
    });

    throw error;
  }
};

const fetchCustomers = async () => {
  try {
    const url: string = `${config.baseUrl}/customers`;
    const options = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      headers: options,
    });
    if (!response.ok) {
      throw Error(response.statusText);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw err;
  }
};

const fetchItems = async () => {
  try {
    const url: string = `${config.baseUrl}/items`;
    const options = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      headers: options,
    });
    if (!response.ok) {
      throw Error(response.statusText);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw err;
  }
};

const fetchCategories = async () => {
  try {
    const url: string = `${config.baseUrl}/categories`;
    const options = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      headers: options,
    });
    if (!response.ok) {
      throw Error(response.statusText);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw err;
  }
};

export default {
  fetchCategories,
  fetchItems,
  fetchCustomers,
  createSalesReceipt,
  getStoreSettings,
  getReceiptStatus,
  createLoyverseCustomer,
};
