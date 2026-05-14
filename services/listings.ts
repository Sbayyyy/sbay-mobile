import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type ListingImage = {
  url: string;
  position: number;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
};

export type SellerSummary = {
  id: string;
  name: string;
  avatar?: string | null;
  rating: number;
  reviewCount: number;
  city?: string | null;
};

export type Listing = {
  id: string;
  sellerId: string;
  priceAmount: number;
  priceCurrency: string;
  stock: number;
  condition: string;
  categoryPath?: string | null;
  region?: string | null;
  createdAt: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  images: ListingImage[];
  imageUrls: string[];
  seller?: SellerSummary | null;
  boostedUntil?: string | null;
  isBoosted?: boolean;
};

export type ListingQuery = {
  text?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
  region?: string;
  condition?: string;
  featured?: boolean;
};

export type CreateListingPayload = {
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency?: string;
  categoryPath?: string;
  region?: string;
  imageUrls?: string[];
  stock?: number;
  condition?: string;
};

export type UpdateListingPayload = Partial<CreateListingPayload>;

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function buildQuery(params: ListingQuery): string {
  const query = new URLSearchParams();
  if (params.text) query.append("text", params.text);
  if (params.category) query.append("category", params.category);
  if (params.page) query.append("page", String(params.page));
  if (params.pageSize) query.append("pageSize", String(params.pageSize));
  if (params.minPrice != null) query.append("minPrice", String(params.minPrice));
  if (params.maxPrice != null) query.append("maxPrice", String(params.maxPrice));
  if (params.region) query.append("region", params.region);
  if (params.condition) query.append("condition", params.condition);
  if (params.featured != null) query.append("featured", String(params.featured));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export async function searchListings(
  params: ListingQuery = {},
): Promise<Listing[]> {
  return apiRequest<Listing[]>(`/api/listings${buildQuery(params)}`);
}

export async function getListing(id: string): Promise<Listing> {
  return apiRequest<Listing>(`/api/listings/${id}`, {
    headers: await authHeader(),
  });
}

export async function getMyListings(): Promise<Listing[]> {
  return apiRequest<Listing[]>("/api/listings/me", {
    headers: await authHeader(),
  });
}

export async function getSellerListings(sellerId: string): Promise<Listing[]> {
  return apiRequest<Listing[]>(`/api/listings/seller/${sellerId}`);
}

export async function createListing(
  payload: CreateListingPayload,
): Promise<Listing> {
  return apiRequest<Listing>("/api/listings", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(payload),
  });
}

export async function updateListing(
  id: string,
  payload: UpdateListingPayload,
): Promise<Listing> {
  return apiRequest<Listing>(`/api/listings/${id}`, {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify(payload),
  });
}

export async function deleteListing(id: string): Promise<void> {
  await apiRequest<void>(`/api/listings/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
