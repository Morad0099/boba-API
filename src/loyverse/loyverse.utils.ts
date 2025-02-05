import dbSettings from "./loyverse.store-settings.db";

interface PaymentMethod {
  id: string;
  name: string;
  // Add other payment method properties
}

interface Settings {
  paymentMethods: PaymentMethod[];
  // Add other settings properties
}

const getStoreId = async (): Promise<string | null> => {
  try {
    const settings = await dbSettings.findOne({});

    if (!settings?.stores?.length) {
      console.warn("No stores found in settings");
      return null;
    }

    const storeId = settings.stores[0]?.id;

    if (!storeId) {
      console.warn("First store has no ID");
      return null;
    }

    return storeId;
  } catch (error) {
    console.error("Error getting store ID:", error);
    throw error;
  }
};

const getPaymentMethodId = async (
  paymentMethod: "momo" | "cash" | "card"
): Promise<string | null> => {
  try {
    const settings = await dbSettings.findOne({});

    if (!settings?.paymentMethods?.length) {
      console.warn("No payment methods found in settings");
      return null;
    }

    const foundMethod = settings.paymentMethods.find(
      (method: any) =>
        method.name?.toLowerCase() === paymentMethod.toLowerCase()
    );

    if (!foundMethod) {
      console.warn(`Payment method "${paymentMethod}" not found`);
      return null;
    }

    return foundMethod.id;
  } catch (error) {
    console.error("Error getting payment method ID:", error);
    throw error;
  }
};

export default {
  getStoreId,
  getPaymentMethodId,
};
