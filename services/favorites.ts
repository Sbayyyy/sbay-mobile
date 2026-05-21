import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import { normalizeListingMedia, type Listing } from "@/services/listings";

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getFavorites(): Promise<Listing[]> {
  const listings = await apiRequest<Listing[]>("/api/favorites", {
    headers: await authHeader(),
  });
  return listings.map(normalizeListingMedia);
}

export async function addFavorite(listingId: string): Promise<void> {
  await apiRequest<void>(`/api/favorites/${listingId}`, {
    method: "POST",
    headers: await authHeader(),
  });
}

export async function removeFavorite(listingId: string): Promise<void> {
  await apiRequest<void>(`/api/favorites/${listingId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
}
