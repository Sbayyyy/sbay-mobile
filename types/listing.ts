export type ListingCategory = {
  id: string;
  label: string;
  emoji?: string;
  translationKey?: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  image: string;
  location?: string;
};

export type FavoriteListing = Listing & {
  currency: string;
  location: string;
  condition: string;
  status?: string | null;
  stock?: number | null;
  seller: string;
  sellerId?: string | null;
  updatedAt: string;
  priceDrop?: string;
  isNew?: boolean;
};
