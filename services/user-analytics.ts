import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type UserStats = {
  totalListings?: number;
  activeListings?: number;
  soldListings?: number;
  hiddenListings?: number;
  totalFavorites?: number;
  totalReviews?: number;
  averageRating?: number;
  totalRevenue?: number;
  totalOrders?: number;
  [key: string]: unknown;
};

export type AnalyticsPoint = {
  date?: string;
  label?: string;
  views?: number;
  favorites?: number;
  messages?: number;
  orders?: number;
  revenue?: number;
  [key: string]: unknown;
};

export type UserAnalytics = {
  points?: AnalyticsPoint[];
  totals?: Record<string, number>;
  [key: string]: unknown;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getUserStats(userId: string): Promise<UserStats> {
  return apiRequest<UserStats>(`/api/users/${userId}/stats`, {
    headers: await authHeader(),
  });
}

export async function getUserAnalytics(
  userId: string,
  from: Date,
  to: Date,
  granularity = "day",
): Promise<UserAnalytics> {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    granularity,
  });
  return apiRequest<UserAnalytics>(`/api/users/${userId}/analytics?${query.toString()}`, {
    headers: await authHeader(),
  });
}
