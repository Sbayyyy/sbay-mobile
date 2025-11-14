export type ListingCategory = {
  id: string;
  label: string;
  emoji?: string;
};

export type Listing = {
  id: string;
  title: string;
  price: string;
  category: string;
  image: string;
};

export type FavoriteListing = Listing & {
  currency: string;
  location: string;
  condition: string;
  seller: string;
  updatedAt: string;
  priceDrop?: string;
  isNew?: boolean;
};
