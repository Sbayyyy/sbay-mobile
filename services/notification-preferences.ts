import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPreferences = {
  newBids: boolean;
  outbid: boolean;
  wonAuction: boolean;
  messages: boolean;
  promotions: boolean;
  priceDrops: boolean;
};

const STORAGE_KEY = "sbay.notifications.preferences";

const defaultPreferences: NotificationPreferences = {
  newBids: true,
  outbid: true,
  wonAuction: true,
  messages: true,
  promotions: false,
  priceDrops: true,
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultPreferences;
  try {
    const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
}

export async function setNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
