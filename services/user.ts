import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import { resolveMediaUrl } from "@/services/media";

export type UserProfile = {
  id: string;
  email: string;
  verified?: boolean | null;
  emailVerified?: boolean | null;
  isEmailVerified?: boolean | null;
  emailConfirmed?: boolean | null;
  isVerified?: boolean | null;
  emailVerifiedAt?: string | null;
  emailConfirmedAt?: string | null;
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar?: string | null;
  role: string;
  isSeller: boolean;
  createdAt: string;
  lastTime?: string | null;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  reviewCount: number;
  rating: number;
  listingBanned: boolean;
  listingBanUntil?: string | null;
  listingLimit?: number | null;
  listingLimitCount: number;
  listingLimitResetAt?: string | null;
};

export type UpdateProfilePayload = {
  displayName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatar?: string | null;
};

export type AccountDeletionRequestResponse = {
  status: string;
  requestedAt: string;
  scheduledDeletionAt: string;
  reason?: string | null;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function normalizeUserProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    avatar: resolveMediaUrl(profile.avatar),
  };
}

function normalizeSellerProfile(profile: SellerProfile): SellerProfile {
  return {
    ...profile,
    avatar: resolveMediaUrl(profile.avatar),
  };
}

export async function getMyProfile(): Promise<UserProfile> {
  const profile = await apiRequest<UserProfile>("/api/users/me", {
    headers: await authHeader(),
  });
  return normalizeUserProfile(profile);
}

export async function updateMyProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const profile = await apiRequest<UserProfile>("/api/users/me", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(payload ?? {}),
  });
  return normalizeUserProfile(profile);
}

export async function requestAccountDeletion(
  reason?: string,
): Promise<AccountDeletionRequestResponse> {
  return apiRequest<AccountDeletionRequestResponse>("/api/users/me/deletion-request", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
}

export type SellerProfile = {
  id: string;
  name: string;
  avatar?: string | null;
  rating: number;
  reviewCount: number;
  totalOrders: number;
  city?: string | null;
  createdAt: string;
};

export async function getSellerProfile(id: string): Promise<SellerProfile> {
  const profile = await apiRequest<SellerProfile>(`/api/users/${id}`);
  return normalizeSellerProfile(profile);
}
