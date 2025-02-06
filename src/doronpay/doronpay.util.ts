import config from "./doronpay.config";

class LazyPayAPI {
  static async getToken(operation = "DEBIT"): Promise<string> {
    const response = await fetch(`${config.LAZYPAY_BASE_URL}/hub/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantId: config.MERCHANT_ID,
        apikey: config.API_KEY,
        operation,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  }

  static async getStatus({ id, token }: any): Promise<any> {
    try {
      const url: string = `${config.LAZYPAY_BASE_URL}/hub/status/${id}`;
      const headers = {
        "Content-type": "Application/json",
        Authorization: "Bearer " + token,
      };
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw Error(response.statusText);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      return data;
    } catch (err: any) {
      throw Error(err);
    }
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
    const response = await fetch(`${config.LAZYPAY_BASE_URL}/hub/debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...data,
        callbackUrl: config.CALLBACK_URL,
        amount: Number(data.amount).toFixed(2),
        account_issuer: data.account_issuer.toLowerCase(),
      }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    return result;
  }
}

export default LazyPayAPI;
