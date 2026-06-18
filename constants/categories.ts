import { type TFunction } from "i18next";

const CATEGORY_SEGMENT_KEYS: Record<string, string> = {
  accessories: "categories.accessories",
  apartment: "categories.apartments",
  apartments: "categories.apartments",
  appliances: "categories.appliances",
  auto: "categories.vehicles",
  baby: "categories.baby",
  bikes: "categories.bikes",
  car: "categories.cars",
  cars: "categories.cars",
  clothes: "categories.fashion",
  clothing: "categories.fashion",
  computers: "categories.computers",
  electronics: "categories.electronics",
  fashion: "categories.fashion",
  furniture: "categories.furniture",
  home: "categories.home",
  house: "categories.realEstate",
  kitchen: "categories.kitchen",
  laptop: "categories.computers",
  laptops: "categories.computers",
  mobile: "categories.mobiles",
  mobiles: "categories.mobiles",
  motorcycle: "categories.motorcycles",
  motorcycles: "categories.motorcycles",
  other: "categories.other",
  phone: "categories.mobiles",
  phones: "categories.mobiles",
  real_estate: "categories.realEstate",
  realestate: "categories.realEstate",
  services: "categories.services",
  sports: "categories.sports",
  toy: "categories.toys",
  toys: "categories.toys",
  vehicle: "categories.vehicles",
  vehicles: "categories.vehicles",
};

function normalizeCategorySegment(value: string): string {
  return value.trim().replace(/[\s-]+/g, "_").toLowerCase();
}

function fallbackCategoryLabel(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategoryLabel(value: string | null | undefined, t: TFunction): string | undefined {
  const normalized = normalizeCategorySegment(value ?? "");
  if (!normalized) return undefined;

  const key = CATEGORY_SEGMENT_KEYS[normalized] ?? `categories.${normalized}`;
  return t(key, { defaultValue: fallbackCategoryLabel(value ?? normalized) });
}

export function formatCategoryPath(
  value: string | null | undefined,
  t: TFunction,
): string | undefined {
  const segments = (value ?? "")
    .split(/[/>|\\]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return undefined;

  return segments
    .map((segment) => getCategoryLabel(segment, t) ?? fallbackCategoryLabel(segment))
    .join(" / ");
}
