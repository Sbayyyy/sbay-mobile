import { type Href } from "expo-router";
import { type PushNotificationData } from "@/types/notifications";

const stripQuery = (value: string) => value.split(/[?#]/)[0];

const firstPathSegmentAfter = (href: string, prefix: string) => {
  const rest = stripQuery(href).slice(prefix.length);
  return rest.split("/").filter(Boolean)[0] ?? null;
};

export function normalizeNotificationHref(href?: string | null): Href | null {
  if (!href || !href.startsWith("/")) return null;

  if (href === "/" || href === "/notifications") return href as Href;
  if (href.startsWith("/search") || href.startsWith("/settings")) return href as Href;
  if (href.startsWith("/chats/thread/")) return href as Href;
  if (href.startsWith("/listings/")) return href as Href;
  if (href.startsWith("/seller/")) return href as Href;
  if (href.startsWith("/category/")) return href as Href;
  if (href.startsWith("/orders/")) return href as Href;
  if (href.startsWith("/dashboard/orders/")) return href as Href;

  const messageId = firstPathSegmentAfter(href, "/messages/");
  if (messageId) return `/chats/thread/${messageId}` as Href;

  const legacyChatId = firstPathSegmentAfter(href, "/chat/");
  if (legacyChatId) return `/chats/thread/${legacyChatId}` as Href;

  const listingId = firstPathSegmentAfter(href, "/listing/");
  if (listingId) return `/listings/${listingId}` as Href;

  const categorySlug = firstPathSegmentAfter(href, "/category/");
  if (categorySlug) return `/category/${categorySlug}` as Href;

  return null;
}

export function getNotificationTarget(data?: PushNotificationData | null): Href | null {
  if (data?.chatId) return `/chats/thread/${data.chatId}` as Href;
  const href = normalizeNotificationHref(data?.href);
  if (href) return href;
  if (data?.listingId) return `/listings/${data.listingId}` as Href;
  return null;
}
