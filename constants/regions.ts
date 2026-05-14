import type { TFunction } from "i18next";

export const SYRIA_REGION_OPTIONS = [
  { id: "Damascus", labelKey: "profile.cities.damascus", aliases: ["دمشق"] },
  { id: "Rif Dimashq", labelKey: "profile.cities.rifDimashq", aliases: ["ريف دمشق"] },
  { id: "Aleppo", labelKey: "profile.cities.aleppo", aliases: ["حلب"] },
  { id: "Homs", labelKey: "profile.cities.homs", aliases: ["حمص"] },
  { id: "Hama", labelKey: "profile.cities.hama", aliases: ["حماة"] },
  { id: "Latakia", labelKey: "profile.cities.latakia", aliases: ["اللاذقية"] },
  { id: "Tartus", labelKey: "profile.cities.tartus", aliases: ["طرطوس"] },
  { id: "Idlib", labelKey: "profile.cities.idlib", aliases: ["إدلب", "ادلب"] },
  { id: "Deir ez-Zor", labelKey: "profile.cities.deirEzZor", aliases: ["دير الزور"] },
  { id: "Raqqa", labelKey: "profile.cities.raqqa", aliases: ["الرقة"] },
  { id: "Hasakah", labelKey: "profile.cities.hasakah", aliases: ["الحسكة"] },
  { id: "Daraa", labelKey: "profile.cities.daraa", aliases: ["درعا"] },
  { id: "As-Suwayda", labelKey: "profile.cities.asSuwayda", aliases: ["السويداء"] },
  { id: "Quneitra", labelKey: "profile.cities.quneitra", aliases: ["القنيطرة"] },
  { id: "Other", labelKey: "profile.cities.other", aliases: ["أخرى", "اخرى"] },
] as const;

export type SyriaRegionId = (typeof SYRIA_REGION_OPTIONS)[number]["id"];

export function normalizeRegion(value?: string | null): SyriaRegionId | "" {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const normalized = trimmed.toLocaleLowerCase();
  const match = SYRIA_REGION_OPTIONS.find((region) => {
    if (region.id.toLocaleLowerCase() === normalized) return true;
    return region.aliases.some((alias) => alias.toLocaleLowerCase() === normalized);
  });

  return match?.id ?? "";
}

export function getRegionLabel(
  value: string | null | undefined,
  t: TFunction,
): string | undefined {
  const canonical = normalizeRegion(value);
  if (!canonical) return value?.trim() || undefined;
  const region = SYRIA_REGION_OPTIONS.find((item) => item.id === canonical);
  return region ? t(region.labelKey, { defaultValue: region.id }) : canonical;
}
