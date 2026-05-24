import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";
import { normalizeListingMedia, type Listing } from "@/services/listings";

export type InteractionType = "view" | "category_click" | "favorite" | "purchase";

function topLevelCategory(categoryPath?: string | null): string {
  return (categoryPath ?? "").trim().split("/")[0]?.trim().toLowerCase() ?? "";
}

export async function trackInteraction(
  categoryPath: string | null | undefined,
  type: InteractionType,
): Promise<void> {
  const category = topLevelCategory(categoryPath);
  if (!category) return;
  const token = await getStoredToken();
  if (!token) return;

  try {
    await apiRequest<void>("/api/recommendations/track", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ category, type }),
      maxRetries: 0,
    });
  } catch {
    // Interest tracking is best-effort and must never break browsing.
  }
}

export async function getRecommendedListings(pageSize = 12): Promise<Listing[]> {
  const token = await getStoredToken();
  if (!token) return [];

  try {
    const listings = await apiRequest<Listing[]>(
      `/api/recommendations/listings?pageSize=${encodeURIComponent(String(pageSize))}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return listings.map(normalizeListingMedia);
  } catch {
    return [];
  }
}

