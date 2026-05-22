import { apiRequest } from "@/services/api";
import { resolveMediaUrl } from "@/services/media";

export type SponsoredAd = {
  id: string;
  type: "ad";
  title: string;
  description: string;
  imageUrl?: string | null;
  ctaText: string;
  targetUrl: string;
  priority: number;
  impressions: number;
  clicks: number;
};

function normalizeSponsoredAd(ad: SponsoredAd): SponsoredAd {
  return {
    ...ad,
    imageUrl: resolveMediaUrl(ad.imageUrl),
  };
}

export async function getSponsoredAds(): Promise<SponsoredAd[]> {
  const ads = await apiRequest<SponsoredAd[]>("/api/ads");
  return ads.map(normalizeSponsoredAd);
}

export async function trackSponsoredAdImpression(id: string): Promise<void> {
  await apiRequest<void>(`/api/ads/${id}/impression`, {
    method: "POST",
  });
}

export async function trackSponsoredAdClick(id: string): Promise<void> {
  await apiRequest<void>(`/api/ads/${id}/click`, {
    method: "POST",
  });
}
