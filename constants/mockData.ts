import { FavoriteListing, Listing, ListingCategory } from "@/types/listing";

export const HOME_CATEGORIES: ListingCategory[] = [
  { id: "all", label: "All", emoji: "🛍️" },
  { id: "electronics", label: "Electronics", emoji: "🔌" },
  { id: "fashion", label: "Fashion", emoji: "👗" },
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "sports", label: "Sports", emoji: "🏀" },
];

export const HOME_LISTINGS: Listing[] = [
  {
    id: "1",
    title: "Noise Cancelling Headphones",
    price: "$189",
    category: "electronics",
    image:
      "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "2",
    title: "Minimalist Sofa",
    price: "$799",
    category: "home",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "3",
    title: "Trail Running Shoes",
    price: "$129",
    category: "sports",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "4",
    title: "Canvas Tote Bag",
    price: "$45",
    category: "fashion",
    image:
      "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=600&q=60",
  },
];

export const FAVORITE_CATEGORIES: ListingCategory[] = [
  { id: "all", label: "All categories" },
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home" },
  { id: "sports", label: "Sports" },
];

export const FAVORITE_LISTINGS: FavoriteListing[] = [
  {
    id: "1",
    title: "Noise Cancelling Headphones",
    price: "180",
    currency: "USD",
    location: "Damascus",
    condition: "Like new",
    category: "electronics",
    seller: "Sarah Julian",
    updatedAt: "2h ago",
    priceDrop: "-$20 this week",
    image:
      "https://images.unsplash.com/photo-1487215078519-e21cc028cb29?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "2",
    title: "Scandinavian Lounge Chair",
    price: "620",
    currency: "USD",
    location: "Homs",
    condition: "Excellent",
    category: "home",
    seller: "Ibrahim N.",
    updatedAt: "1d ago",
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "3",
    title: "Trail Running Set",
    price: "95",
    currency: "USD",
    location: "Latakia",
    condition: "Good",
    category: "sports",
    seller: "Omar Ali",
    updatedAt: "4h ago",
    isNew: true,
    image:
      "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=600&q=60",
  },
  {
    id: "4",
    title: "Canvas Tote & Accessories",
    price: "48",
    currency: "USD",
    location: "Aleppo",
    condition: "Like new",
    category: "fashion",
    seller: "Salma Odeh",
    updatedAt: "3d ago",
    priceDrop: "-10% today",
    image:
      "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=600&q=60",
  },
];

export const ADD_LISTING_CATEGORIES = [
  { id: "electronics", label: "Electronics" },
  { id: "fashion", label: "Fashion" },
  { id: "home", label: "Home" },
  { id: "sports", label: "Sports" },
  { id: "toys", label: "Toys" },
];

export const LISTING_CONDITIONS = ["New", "Like New", "Good", "Fair"] as const;

export const CURRENCY_OPTIONS = ["SYP", "USD", "EUR"] as const;

export const PHOTO_SLOTS = Array.from({ length: 5 }, (_, index) => index + 1);
