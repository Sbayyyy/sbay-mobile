import { type TFunction } from "i18next";

import { getRegionLabel } from "@/constants/regions";
import { type Listing as ApiListing } from "@/services/listings";
import { type Listing as ListingCardListing } from "@/types/listing";

function getPrimaryImage(listing: ApiListing): string {
  return listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? "";
}

export function toListingCardListing(
  listing: ApiListing,
  t: TFunction,
  fallbackCategory = "other",
): ListingCardListing {
  return {
    id: listing.id,
    title: listing.title,
    price: `${listing.priceCurrency} ${listing.priceAmount}`,
    category: listing.categoryPath ?? fallbackCategory,
    location: getRegionLabel(listing.region ?? listing.seller?.city, t),
    image: getPrimaryImage(listing),
    sellerRating: listing.seller?.rating ?? null,
    sellerReviewCount: listing.seller?.reviewCount ?? null,
    sellerMemberSince: listing.seller?.createdAt
      ? `${t("sellerProfile.stats.memberSince", {
          defaultValue: "Member since",
        })} ${new Date(listing.seller.createdAt).toLocaleDateString()}`
      : null,
  };
}

export function toListingCardListings(
  listings: ApiListing[],
  t: TFunction,
  fallbackCategory = "other",
): ListingCardListing[] {
  return listings.map((listing) => toListingCardListing(listing, t, fallbackCategory));
}
