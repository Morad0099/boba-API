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
  paymentMethods: Array<{
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
    const { paymentMethods }: PaymentResponse = await paymentResponse.json();

    return {
      storeData: stores,
      paymentData: paymentMethods,
    };
  } catch (error) {
    console.error("Failed to fetch store settings:", error);
    throw error;
  }
};

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

const createSalesReceipt = async (payload: any) => {
  try {
    const url: string = `${config.baseUrl}/receipts`;
    const options = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: options,
      body: JSON.stringify(payload),
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
};
