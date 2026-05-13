import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type BoostOption = {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
};

export type PaymentTransaction = {
  id: string;
  provider: string;
  providerReference?: string | null;
  purpose: string;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getBoostOptions(): Promise<BoostOption[]> {
  return apiRequest<BoostOption[]>("/api/monetization/boost-options");
}

export async function createBoostPayment(
  listingId: string,
  optionId: string,
  returnUrl = "/me",
): Promise<PaymentTransaction> {
  return apiRequest<PaymentTransaction>(
    `/api/monetization/listings/${listingId}/boost`,
    {
      method: "POST",
      headers: await authHeader(),
      body: JSON.stringify({ optionId, returnUrl }),
    },
  );
}
