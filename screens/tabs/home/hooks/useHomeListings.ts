import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getCache, setCache } from "@/services/cache";
import { getFriendlyErrorMessage } from "@/services/account-status-errors";
import { getSponsoredAds, type SponsoredAd } from "@/services/ads";
import { searchListings, type Listing } from "@/services/listings";
import { getRecommendedListings } from "@/services/recommendations";

type LoadMode = "initial" | "refresh";

export function useHomeListings(activeCategory: string) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<Listing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadListings = useCallback(
    (mode: LoadMode = "initial") => {
      let isMounted = true;
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const run = async () => {
        if (mode === "initial") {
          const [cached, cachedFeatured] = await Promise.all([
            getCache<Listing[]>(`listings.${activeCategory}`).catch(() => null),
            getCache<Listing[]>("listings.featured").catch(() => null),
          ]);
          if (isMounted && cached) {
            setListings(cached);
            setFeaturedListings((cachedFeatured ?? []).filter((listing) => listing.isBoosted === true));
            setLoading(false);
          }
        }

        try {
          const [nextListings, recommended, featured, ads] = await Promise.all([
            searchListings({
              category: activeCategory === "all" ? undefined : activeCategory,
            }),
            activeCategory === "all" ? getRecommendedListings(12) : Promise.resolve([]),
            searchListings({
              featured: true,
              pageSize: 8,
            }),
            getSponsoredAds().catch(() => []),
          ]);
          if (!isMounted) return;

          setListings(nextListings);
          setRecommendedListings(recommended);
          setFeaturedListings(featured.filter((listing) => listing.isBoosted === true));
          setSponsoredAds(ads);
          setError(null);
          void setCache(`listings.${activeCategory}`, nextListings, 5 * 60 * 1000).catch(() => {});
          void setCache("listings.featured", featured, 5 * 60 * 1000).catch(() => {});
        } catch (err) {
          if (!isMounted) return;
          setError(getFriendlyErrorMessage(err, t("listings.errorSubtitle")));
        } finally {
          if (!isMounted) return;
          setLoading(false);
          setRefreshing(false);
        }
      };

      const handle = mode === "refresh" ? null : setTimeout(run, 300);
      if (mode === "refresh") {
        void run();
      }

      return () => {
        isMounted = false;
        if (handle) clearTimeout(handle);
      };
    },
    [activeCategory, t],
  );

  useEffect(() => {
    const cleanup = loadListings("initial");
    return () => cleanup?.();
  }, [loadListings]);

  const refreshListings = useCallback(() => {
    loadListings("refresh");
  }, [loadListings]);

  return {
    listings,
    recommendedListings,
    featuredListings,
    sponsoredAds,
    loading,
    refreshing,
    error,
    refreshListings,
  };
}
