import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type NotificationPreferences = {
  emailNewBids: boolean;
  emailOutbidAlerts: boolean;
  emailWonAuctions: boolean;
  emailMessages: boolean;
  emailPriceDrops: boolean;
  emailPromotions: boolean;
  pushNewBids: boolean;
  pushOutbidAlerts: boolean;
  pushWonAuctions: boolean;
  pushMessages: boolean;
};

const STORAGE_KEY = "sbay.notifications.preferences";

export const defaultNotificationPreferences: NotificationPreferences = {
  emailNewBids: true,
  emailOutbidAlerts: true,
  emailWonAuctions: true,
  emailMessages: true,
  emailPriceDrops: true,
  emailPromotions: false,
  pushNewBids: true,
  pushOutbidAlerts: true,
  pushWonAuctions: true,
  pushMessages: false,
};

type LegacyNotificationPreferences = {
  newBids?: boolean;
  outbid?: boolean;
  wonAuction?: boolean;
  messages?: boolean;
  promotions?: boolean;
  priceDrops?: boolean;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function normalizePreferences(
  value?: Partial<NotificationPreferences> & LegacyNotificationPreferences,
): NotificationPreferences {
  if (!value) return defaultNotificationPreferences;
  return {
    emailNewBids: value.emailNewBids ?? value.newBids ?? defaultNotificationPreferences.emailNewBids,
    emailOutbidAlerts:
      value.emailOutbidAlerts ?? value.outbid ?? defaultNotificationPreferences.emailOutbidAlerts,
    emailWonAuctions:
      value.emailWonAuctions ?? value.wonAuction ?? defaultNotificationPreferences.emailWonAuctions,
    emailMessages: value.emailMessages ?? value.messages ?? defaultNotificationPreferences.emailMessages,
    emailPriceDrops:
      value.emailPriceDrops ?? value.priceDrops ?? defaultNotificationPreferences.emailPriceDrops,
    emailPromotions:
      value.emailPromotions ?? value.promotions ?? defaultNotificationPreferences.emailPromotions,
    pushNewBids: value.pushNewBids ?? value.newBids ?? defaultNotificationPreferences.pushNewBids,
    pushOutbidAlerts:
      value.pushOutbidAlerts ?? value.outbid ?? defaultNotificationPreferences.pushOutbidAlerts,
    pushWonAuctions:
      value.pushWonAuctions ?? value.wonAuction ?? defaultNotificationPreferences.pushWonAuctions,
    pushMessages: value.pushMessages ?? value.messages ?? defaultNotificationPreferences.pushMessages,
  };
}

async function readCachedPreferences(): Promise<NotificationPreferences> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultNotificationPreferences;
  try {
    return normalizePreferences(JSON.parse(stored));
  } catch {
    return defaultNotificationPreferences;
  }
}

async function cachePreferences(preferences: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const preferences = await apiRequest<NotificationPreferences>("/api/notifications/preferences", {
      headers: await authHeader(),
    });
    const normalized = normalizePreferences(preferences);
    await cachePreferences(normalized);
    return normalized;
  } catch {
    return readCachedPreferences();
  }
}

export async function setNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const normalized = normalizePreferences(preferences);
  const saved = await apiRequest<NotificationPreferences>("/api/notifications/preferences", {
    method: "PUT",
    headers: await authHeader(),
    body: JSON.stringify(normalized),
  });
  const next = normalizePreferences(saved);
  await cachePreferences(next);
  return next;
}
