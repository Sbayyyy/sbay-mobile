import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import { resolveMediaUrl } from "@/services/media";

export type ListingImage = {
  url: string;
  position: number;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ListingStatus = "active" | "sold" | "hidden";

export type SellerSummary = {
  id: string;
  name: string;
  avatar?: string | null;
  rating: number;
  reviewCount: number;
  city?: string | null;
  createdAt?: string | null;
};

export type Listing = {
  id: string;
  sellerId: string;
  priceAmount: number;
  priceCurrency: string;
  stock: number;
  condition: string;
  status?: ListingStatus | "inactive" | "deleted" | string | null;
  categoryPath?: string | null;
  region?: string | null;
  createdAt: string;
  soldUntil?: string | null;
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

export type UpdateListingStatusPayload = {
  status: ListingStatus;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function normalizeListingMedia(listing: Listing): Listing {
  const imageUrls = listing.imageUrls?.map((url) => resolveMediaUrl(url) ?? url) ?? [];
  return {
    ...listing,
    thumbnailUrl: resolveMediaUrl(listing.thumbnailUrl),
    images: listing.images?.map((image) => ({
      ...image,
      url: resolveMediaUrl(image.url) ?? image.url,
    })) ?? [],
    imageUrls,
    seller: listing.seller
      ? {
          ...listing.seller,
          avatar: resolveMediaUrl(listing.seller.avatar),
        }
      : listing.seller,
  };
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
  const listings = await apiRequest<Listing[]>(`/api/listings${buildQuery(params)}`);
  return listings.map(normalizeListingMedia);
}

export async function getListing(id: string): Promise<Listing> {
  const listing = await apiRequest<Listing>(`/api/listings/${id}`, {
    headers: await authHeader(),
  });
  return normalizeListingMedia(listing);
}

export async function getMyListings(): Promise<Listing[]> {
  const listings = await apiRequest<Listing[]>("/api/listings/me", {
    headers: await authHeader(),
  });
  return listings.map(normalizeListingMedia);
}

export async function getSellerListings(sellerId: string): Promise<Listing[]> {
  const listings = await apiRequest<Listing[]>(`/api/listings/seller/${sellerId}`);
  return listings.map(normalizeListingMedia);
}

export async function createListing(
  payload: CreateListingPayload,
): Promise<Listing> {
  const listing = await apiRequest<Listing>("/api/listings", {
    method: "POST",
    headers: await authHeader(),
    body: JSON.stringify(payload),
  });
  return normalizeListingMedia(listing);
}

export async function updateListing(
  id: string,
  payload: UpdateListingPayload & Partial<UpdateListingStatusPayload>,
): Promise<Listing> {
  const listing = await apiRequest<Listing>(`/api/listings/${id}`, {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify(payload),
  });
  return normalizeListingMedia(listing);
}

export async function updateListingStatus(
  id: string,
  status: ListingStatus,
): Promise<Listing> {
  return updateListing(id, { status });
}

export async function markListingSold(id: string): Promise<Listing> {
  return updateListingStatus(id, "sold");
}

export async function relistListing(id: string): Promise<Listing> {
  return updateListingStatus(id, "active");
}

export async function hideListing(id: string): Promise<Listing> {
  return updateListingStatus(id, "hidden");
}

export async function deleteListing(id: string): Promise<void> {
  await apiRequest<void>(`/api/listings/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
