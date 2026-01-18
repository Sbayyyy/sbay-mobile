import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import { type Listing } from "@/services/listings";

async function authHeader() {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function getFavorites(): Promise<Listing[]> {
  return apiRequest<Listing[]>("/api/favorites", {
    headers: await authHeader(),
  });
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
