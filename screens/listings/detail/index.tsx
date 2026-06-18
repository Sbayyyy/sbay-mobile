import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/layout/AppScreen";
import { ListingImageGallery } from "@/components/listings/ListingImageGallery";
import { ReportModal } from "@/components/reports/ReportModal";
import { formatCategoryPath } from "@/constants/categories";
import { getRegionLabel } from "@/constants/regions";
import {
  MarketplaceRadius,
  MarketplaceShadow,
  MarketplaceSpacing,
  MarketplaceTypography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  deleteListing,
  getListing,
  hideListing,
  markListingSold,
  relistListing,
  type Listing as ApiListing,
} from "@/services/listings";
import { getStoredToken } from "@/services/auth";
import { getMyProfile, type UserProfile } from "@/services/user";
import { addFavorite, getFavorites, removeFavorite } from "@/services/favorites";
import { openChat } from "@/services/messages";
import { WEB_BASE_URL } from "@/services/config";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppPopup } from "@/providers/AppPopupProvider";
import {
  isEmailVerified,
  isUnverifiedEmailError,
  showEmailVerificationRequiredAlert,
} from "@/services/email-verification";
import { getActionErrorMessage, getFriendlyErrorMessage } from "@/services/account-status-errors";
import { trackInteraction } from "@/services/recommendations";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80";

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { showError } = useAppPopup();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [listing, setListing] = useState<ApiListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getStoredToken()
      .then((token) => {
        if (!token) return;
        return getMyProfile();
      })
      .then((profile) => {
        if (!isMounted || !profile) return;
        setProfile(profile);
        setProfileId(profile.id);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadFavoriteState = async () => {
      try {
        const token = await getStoredToken();
        if (!token || !listing?.id) return;
        const favorites = await getFavorites();
        if (!isMounted) return;
        setIsFavorite(favorites.some((item) => item.id === listing.id));
      } catch {
        // ignore favorite load errors
      }
    };
    void loadFavoriteState();
    return () => {
      isMounted = false;
    };
  }, [listing?.id]);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;
    setLoading(true);
    setError(null);
    getListing(id)
      .then((data) => {
        if (!isMounted) return;
        setListing(data);
        void trackInteraction(data.categoryPath, "view");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          getFriendlyErrorMessage(
            err,
            t("listings.errorSubtitle", { defaultValue: "Please try again." }),
          ),
        );
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id, t]);

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (!listing || error) {
    return (
      <AppScreen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {t("listings.unavailableTitle", { defaultValue: "Listing unavailable" })}
          </Text>
          <Text style={styles.emptySubtitle}>
            {error ?? t("listings.tryAgain", { defaultValue: "Please try again." })}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonLabel}>
              {t("sellerProfile.actions.goBack", { defaultValue: "Go back" })}
            </Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  const imageUrl =
    listing.thumbnailUrl ?? listing.imageUrls?.[0] ?? FALLBACK_IMAGE;
  const imageUrls =
    listing.imageUrls && listing.imageUrls.length > 0
      ? listing.imageUrls
      : [imageUrl];

  const conditionLabels: Record<string, string> = {
    New: t("addListing.conditions.new", { defaultValue: "New" }),
    LikeNew: t("addListing.conditions.like_new", { defaultValue: "Like new" }),
    Good: t("addListing.conditions.good", { defaultValue: "Good" }),
    Fair: t("addListing.conditions.fair", { defaultValue: "Fair" }),
    Poor: t("addListing.conditions.poor", { defaultValue: "Poor" }),
    Used: t("addListing.conditions.used", { defaultValue: "Used" }),
    Refurbished: t("addListing.conditions.refurbished", { defaultValue: "Refurbished" }),
  };

  const listingStatus = (listing.status ?? "active").toLowerCase();
  const isSold = listingStatus === "sold" || (listing.stock != null && listing.stock <= 0);
  const isHidden = listingStatus === "hidden" || listingStatus === "inactive";
  const isAvailable = listingStatus === "active" && (listing.stock === undefined || listing.stock > 0);
  const statusLabel = isSold
    ? t("listings.status.sold", { defaultValue: "Sold" })
    : isHidden
      ? t("listings.status.hidden", { defaultValue: "Hidden" })
      : t("listings.status.active", { defaultValue: "Active" });
  const sellerProfileId = listing.seller?.id ?? listing.sellerId ?? null;
  const regionLabel = getRegionLabel(listing.region, t);
  const categoryLabel = formatCategoryPath(listing.categoryPath, t);
  const conditionLabel = listing.condition
    ? conditionLabels[listing.condition] ?? listing.condition
    : null;
  const isOwnListing =
    !!profileId && (listing.sellerId === profileId || listing.seller?.id === profileId);
  const backIconName = I18nManager.isRTL ? "chevron-forward" : "chevron-back";
  const forwardIconName = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

  const handleDeleteListing = () => {
    if (deleteLoading) return;
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteDialogOpen(false);
    setDeleteLoading(true);
    try {
      await deleteListing(listing.id);
      router.replace("/");
    } catch (err) {
      showError(
        getActionErrorMessage(err, t("listings.deleteFailedBody")),
        t("listings.deleteFailedTitle"),
      );
    } finally {
      setDeleteLoading(false);
    }
  };
  const updateOwnerListingStatus = async (
    action: "sold" | "active" | "hidden",
  ) => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    try {
      const updated =
        action === "sold"
          ? await markListingSold(listing.id)
          : action === "hidden"
            ? await hideListing(listing.id)
            : await relistListing(listing.id);
      setListing(updated);
    } catch (err) {
      showError(
        getActionErrorMessage(
          err,
          t("listings.updateFailedBody", { defaultValue: "Unable to update listing status." }),
        ),
        t("listings.updateFailedTitle", { defaultValue: "Listing update failed" }),
      );
    } finally {
      setStatusUpdating(false);
    }
  };
  const handleContactSeller = async () => {
    if (openingChat) return;

    try {
      const token = await getStoredToken();
      if (!token) {
        showError(t("listings.signInMessageSeller"), t("listings.signInRequiredTitle"));
        return;
      }

      const sellerId = sellerProfileId;
      if (!sellerId || !listing?.id) {
        showError(t("listings.sellerMissing"), t("listings.contactSellerTitle"));
        return;
      }

      if (!isAvailable) {
        showError(
          t("listings.unavailableMessage", {
            defaultValue: "This listing is not currently available.",
          }),
          t("listings.unavailableTitle", { defaultValue: "Listing unavailable" }),
        );
        return;
      }

      if (profile && !isEmailVerified(profile)) {
        showEmailVerificationRequiredAlert();
        return;
      }

      setOpeningChat(true);

      const { chatId } = await openChat({
        otherUserId: sellerId,
        listingId: listing.id,
      });

      router.push(`/chats/thread/${chatId}`);
    } catch (err) {
      if ((!profile || !isEmailVerified(profile)) && isUnverifiedEmailError(err)) {
        showEmailVerificationRequiredAlert();
        return;
      }
      showError(
        getActionErrorMessage(err, t("listings.tryAgain")),
        t("listings.openChatFailedTitle"),
      );
    } finally {
      setOpeningChat(false);
    }
  };
  return (
    <AppScreen>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.container,
            !isOwnListing && styles.containerWithStickyAction,
          ]}
        >
          <TouchableOpacity style={styles.backButtonInline} onPress={() => router.back()}>
            <Ionicons name={backIconName} size={16} color={theme.primary} />
            <Text style={styles.backButtonLabel}>{t("listings.back")}</Text>
          </TouchableOpacity>

        <ListingImageGallery imageUrls={imageUrls} title={listing.title} />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>
            <View
              style={[
                styles.statusBadge,
                isSold && styles.statusBadgeSold,
                isHidden && styles.statusBadgeHidden,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isSold && styles.statusBadgeTextSold,
                  isHidden && styles.statusBadgeTextHidden,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.price}>
            {listing.priceCurrency} {listing.priceAmount}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              if (!listing?.id || favoriteLoading) return;
              const token = await getStoredToken();
              if (!token) {
                showError(t("listings.signInFavorite"), t("listings.signInRequiredTitle"));
                return;
              }
              const nextValue = !isFavorite;
              setIsFavorite(nextValue);
              setFavoriteLoading(true);
              try {
                if (nextValue) {
                  await addFavorite(listing.id);
                  void trackInteraction(listing.categoryPath, "favorite");
                } else {
                  await removeFavorite(listing.id);
                }
                const refreshed = await getFavorites();
                setIsFavorite(refreshed.some((item) => item.id === listing.id));
              } catch (err) {
                setIsFavorite(!nextValue);
                showError(
                  err instanceof Error ? err.message : t("listings.favoriteFailedBody"),
                  t("listings.favoriteFailedTitle"),
                );
              } finally {
                setFavoriteLoading(false);
              }
            }}
            disabled={favoriteLoading}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? theme.danger : theme.primary}
            />
            <Text style={styles.actionLabel}>
              {isFavorite ? t("listings.favorited") : t("listings.favorite")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              try {
                const shareUrl = `${WEB_BASE_URL}/listing/${listing.id}`;
                const message = t("listings.shareMessage", {
                  title: listing.title,
                  url: shareUrl,
                });
                await Share.share({
                  title: listing.title,
                  message,
                });
              } catch {
                showError(t("listings.shareFailedBody"), t("listings.shareFailedTitle"));
              }
            }}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.primary} />
            <Text style={styles.actionLabel}>{t("listings.share")}</Text>
          </TouchableOpacity>
          {!isOwnListing ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setReportOpen(true)}
            >
              <Ionicons name="flag-outline" size={18} color={theme.danger} />
              <Text style={styles.actionLabel}>
                {t("report.actions.report", { defaultValue: "Report" })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {listing.condition ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>
                {conditionLabel}
              </Text>
            </View>
          ) : null}
          {listing.region ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>{regionLabel}</Text>
            </View>
          ) : null}
          {categoryLabel ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>{categoryLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("listings.description", { defaultValue: "Description" })}
          </Text>
          <Text style={styles.sectionBody}>{listing.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("listings.details", { defaultValue: "Details" })}
          </Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {t("listings.category", { defaultValue: "Category" })}
              </Text>
              <Text style={styles.detailValue}>
                {categoryLabel ?? t("listings.uncategorized", { defaultValue: "Uncategorized" })}
              </Text>
            </View>
            {listing.condition ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("listings.condition", { defaultValue: "Condition" })}
                </Text>
                <Text style={styles.detailValue}>
                  {conditionLabel}
                </Text>
              </View>
            ) : null}
            {listing.region ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("listings.location", { defaultValue: "Location" })}
                </Text>
                <Text style={styles.detailValue}>{regionLabel}</Text>
              </View>
            ) : null}
            {listing.stock != null ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("listings.stock", { defaultValue: "Stock" })}
                </Text>
                <Text style={styles.detailValue}>{listing.stock}</Text>
              </View>
            ) : null}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>
                {t("listings.statusLabel", { defaultValue: "Status" })}
              </Text>
              <Text style={styles.detailValue}>{statusLabel}</Text>
            </View>
            {listing.soldUntil ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>
                  {t("listings.soldUntil", { defaultValue: "Sold until" })}
                </Text>
                <Text style={styles.detailValue}>
                  {new Date(listing.soldUntil).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("listings.seller", { defaultValue: "Seller" })}
          </Text>
          <TouchableOpacity
            style={styles.sellerRow}
            disabled={!sellerProfileId}
            onPress={() => {
              if (sellerProfileId) {
                router.push(`/seller/${sellerProfileId}`);
              }
            }}
          >
            <View style={styles.sellerAvatar}>
              {listing.seller?.avatar ? (
                <Image
                  source={{ uri: listing.seller.avatar }}
                  style={styles.sellerAvatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={listing.seller.name}
                />
              ) : (
                <Text style={styles.sellerInitial}>
                  {(listing.seller?.name ?? "U").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionBody}>
                {listing.seller?.name ?? t("listings.unknownSeller", { defaultValue: "Unknown seller" })}
              </Text>
              {listing.seller ? (
                <Text style={styles.sectionMeta}>
                  {t("listings.sellerRatingLine", {
                    defaultValue: "Rating {{rating}} · {{count}} reviews",
                    rating: listing.seller.rating.toFixed(1),
                    count: listing.seller.reviewCount,
                  })}
                </Text>
              ) : null}
            </View>
            {sellerProfileId ? (
              <Ionicons name={forwardIconName} size={18} color={theme.textMuted} />
            ) : null}
          </TouchableOpacity>
        </View>

        {(!isAvailable || isOwnListing) ? (
          <View style={styles.section}>
            {!isAvailable ? (
              <View style={styles.noticeBanner}>
                <Text style={styles.noticeText}>
                  {t("listings.unavailableNotice", { defaultValue: "Item is currently unavailable." })}
                </Text>
              </View>
            ) : null}

            {isOwnListing ? (
            <View style={styles.ownerActions}>
              <View style={styles.noticeBannerInfo}>
                <Text style={styles.noticeInfoText}>{t("listings.yourListing", { defaultValue: "This is your listing." })}</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push(`/listings/${listing.id}/edit`)}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonLabel}>{t("listings.editListing", { defaultValue: "Edit listing" })}</Text>
              </TouchableOpacity>
              {isSold || isHidden ? (
                <TouchableOpacity
                  style={[styles.primaryButton, statusUpdating && { opacity: 0.7 }]}
                  onPress={() => updateOwnerListingStatus("active")}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.primaryButtonLabel}>
                    {statusUpdating ? t("listings.updating", { defaultValue: "Updating..." }) : t("listings.relist", { defaultValue: "Relist" })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      styles.successButton,
                      statusUpdating && { opacity: 0.7 },
                    ]}
                    onPress={() => updateOwnerListingStatus("sold")}
                    disabled={statusUpdating}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonLabel}>
                      {statusUpdating ? t("listings.updating", { defaultValue: "Updating..." }) : t("listings.markSold", { defaultValue: "Mark sold" })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      styles.secondaryOwnerButton,
                      statusUpdating && { opacity: 0.7 },
                    ]}
                    onPress={() => updateOwnerListingStatus("hidden")}
                    disabled={statusUpdating}
                  >
                    <Ionicons name="eye-off-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonLabel}>
                      {statusUpdating ? t("listings.updating", { defaultValue: "Updating..." }) : t("listings.hideListing", { defaultValue: "Hide listing" })}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={[styles.primaryButton, styles.dangerButton]}
                onPress={handleDeleteListing}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonLabel}>
                  {deleteLoading
                    ? t("listings.deleting", { defaultValue: "Deleting..." })
                    : t("listings.deleteListing", { defaultValue: "Delete listing" })}
                </Text>
              </TouchableOpacity>
            </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {!isOwnListing ? (
        <View style={styles.stickyActionBar}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.stickyPrimaryButton,
              (openingChat || !isAvailable) && { opacity: 0.7 },
            ]}
            onPress={handleContactSeller}
            disabled={openingChat || !isAvailable}
          >
            {openingChat ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            )}
            <Text style={styles.primaryButtonLabel}>
              {openingChat
                ? t("listings.opening", { defaultValue: "Opening..." })
                : t("listings.contactSellerTitle", { defaultValue: "Contact seller" })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t("listings.deleteTitle", { defaultValue: "Delete listing?" })}
            </Text>
            <Text style={styles.modalBody}>
              {t("listings.deleteBody", { defaultValue: "This action cannot be undone." })}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setDeleteDialogOpen(false)}
              >
                <Text style={styles.modalButtonText}>
                  {t("common.actions.cancel", { defaultValue: "Cancel" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalButtonText}>
                  {t("common.actions.delete", { defaultValue: "Delete" })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {listing?.id ? (
        <ReportModal
          visible={reportOpen}
          targetType="Listing"
          targetId={listing.id}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
      </SafeAreaView>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    container: {
      padding: MarketplaceSpacing.lg,
      gap: MarketplaceSpacing.md,
      paddingBottom: 32,
    },
    containerWithStickyAction: {
      paddingBottom: MarketplaceSpacing.md,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      gap: MarketplaceSpacing.xs,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    title: {
      flex: 1,
      fontSize: MarketplaceTypography.screenTitle,
      fontWeight: "800",
      color: theme.text,
      lineHeight: 28,
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      backgroundColor: theme.successBackground,
      borderWidth: 1,
      borderColor: theme.success,
    },
    statusBadgeSold: {
      backgroundColor: "#FDECEC",
      borderColor: theme.danger,
    },
    statusBadgeHidden: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.border,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.success,
    },
    statusBadgeTextSold: {
      color: theme.danger,
    },
    statusBadgeTextHidden: {
      color: theme.textMuted,
    },
    price: {
      fontSize: 22,
      fontWeight: "900",
      color: theme.success,
    },
    actionRow: {
      flexDirection: "row",
      gap: MarketplaceSpacing.sm,
      flexWrap: "wrap",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.sm,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primary,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: MarketplaceSpacing.sm,
    },
    metaChip: {
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surfaceMuted,
    },
    metaChipLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    section: {
      gap: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.card,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: MarketplaceSpacing.lg,
      shadowColor: theme.shadow,
      ...MarketplaceShadow.subtle,
    },
    sectionTitle: {
      fontSize: MarketplaceTypography.input,
      fontWeight: "800",
      color: theme.text,
    },
    sectionBody: {
      fontSize: MarketplaceTypography.body,
      color: theme.textMuted,
      lineHeight: 21,
    },
    sectionMeta: {
      fontSize: 12,
      color: theme.textSubtle,
    },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: MarketplaceSpacing.sm,
    },
    detailItem: {
      width: "48%",
      backgroundColor: theme.surfaceMuted,
      borderRadius: MarketplaceRadius.md,
      padding: MarketplaceSpacing.md,
      gap: MarketplaceSpacing.xs,
      borderWidth: 1,
      borderColor: theme.border,
    },
    detailLabel: {
      fontSize: 12,
      color: theme.textSubtle,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    sellerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.md,
    },
    sellerAvatar: {
      width: 48,
      height: 48,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    sellerAvatarImage: {
      width: "100%",
      height: "100%",
    },
    sellerInitial: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.primary,
    },
    noticeBanner: {
      padding: MarketplaceSpacing.md,
      borderRadius: MarketplaceRadius.md,
      backgroundColor: "#FDECEC",
    },
    noticeText: {
      color: "#B42318",
      fontWeight: "600",
      textAlign: "center",
    },
    noticeBannerInfo: {
      padding: MarketplaceSpacing.md,
      borderRadius: MarketplaceRadius.md,
      backgroundColor: "#E9F2FF",
    },
    noticeInfoText: {
      color: "#175CD3",
      fontWeight: "600",
      textAlign: "center",
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: MarketplaceSpacing.sm,
      paddingVertical: MarketplaceSpacing.md,
      borderRadius: MarketplaceRadius.lg,
      backgroundColor: theme.primary,
      shadowColor: theme.primary,
      ...MarketplaceShadow.subtle,
    },
    dangerButton: {
      backgroundColor: theme.danger,
    },
    successButton: {
      backgroundColor: theme.success,
    },
    secondaryOwnerButton: {
      backgroundColor: theme.textMuted,
    },
    primaryButtonLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: "#fff",
    },
    stickyActionBar: {
      paddingHorizontal: MarketplaceSpacing.lg,
      paddingTop: MarketplaceSpacing.md,
      paddingBottom: MarketplaceSpacing.lg,
      backgroundColor: theme.navigationBackground,
      borderTopWidth: 1,
      borderTopColor: theme.navigationBorder,
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
    stickyPrimaryButton: {
      width: "100%",
      minHeight: 50,
    },
    ownerActions: {
      gap: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: MarketplaceSpacing.xxl,
      gap: MarketplaceSpacing.sm,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
    },
    backButton: {
      paddingHorizontal: MarketplaceSpacing.lg,
      paddingVertical: MarketplaceSpacing.sm,
      borderRadius: MarketplaceRadius.md,
      backgroundColor: theme.surfaceMuted,
    },
    backButtonInline: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: MarketplaceSpacing.xs,
      paddingHorizontal: MarketplaceSpacing.md,
      paddingVertical: MarketplaceSpacing.xs,
      borderRadius: MarketplaceRadius.pill,
      backgroundColor: theme.surfaceMuted,
    },
    backButtonLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: MarketplaceSpacing.xxl,
    },
    modalCard: {
      width: "100%",
      borderRadius: MarketplaceRadius.sheet,
      padding: MarketplaceSpacing.xl,
      backgroundColor: theme.surface,
      gap: MarketplaceSpacing.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    modalBody: {
      fontSize: 14,
      color: theme.textMuted,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      justifyContent: "flex-end",
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surfaceMuted,
    },
    modalButtonDanger: {
      backgroundColor: theme.danger,
    },
    modalButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
  });
