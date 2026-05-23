import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { SectionHeader } from "@/components/common/SectionHeader";
import { ListingCard } from "@/components/listings/ListingCard";
import { getRegionLabel } from "@/constants/regions";
import { type Listing, type ListingStatus } from "@/services/listings";
import { type BoostOption } from "@/services/monetization";

type Props = {
  listings: Listing[];
  listingsLoading: boolean;
  listingsError: string | null;
  boostOptions: BoostOption[];
  boostingListingId: string | null;
  statusUpdatingListingId: string | null;
  onBoostPress: (listing: Listing) => void;
  onStatusChange: (listing: Listing, status: ListingStatus) => void;
};

function getListingStatusFlags(listing: Listing) {
  const status = (listing.status ?? "active").toLowerCase();
  const isSold = status === "sold" || (listing.stock != null && listing.stock <= 0);
  const isHidden = status === "hidden" || status === "inactive";
  const isDeleted = status === "deleted";
  return {
    isActive: status === "active" && !isSold && !isHidden && !isDeleted,
    isSold,
    isHidden,
    isDeleted,
  };
}

export function MeListingsTab({
  listings,
  listingsLoading,
  listingsError,
  boostOptions,
  boostingListingId,
  statusUpdatingListingId,
  onBoostPress,
  onStatusChange,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = createStyles(theme);

  return (
    <View>
      <SectionHeader title={t("profile.myListings")} actionLabel={t("common.actions.seeAll")} />
      {listingsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      ) : listingsError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {t("profile.errors.listingsTitle", { defaultValue: "Unable to load listings" })}
          </Text>
          <Text style={styles.emptySubtitle}>{listingsError}</Text>
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("common.empty.noListings")}</Text>
          <Text style={styles.emptySubtitle}>{t("profile.emptyListingsSubtitle")}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {listings.map((item) => {
            const isBoosting = boostingListingId === item.id;
            const isStatusUpdating = statusUpdatingListingId === item.id;
            const flags = getListingStatusFlags(item);
            const statusLabel = flags.isSold
              ? t("listings.status.sold", { defaultValue: "Sold" })
              : flags.isHidden
                ? t("listings.status.hidden", { defaultValue: "Hidden" })
                : flags.isDeleted
                  ? t("listings.status.deleted", { defaultValue: "Deleted" })
                  : t("listings.status.active", { defaultValue: "Active" });
            const canBoost =
              flags.isActive && !item.isBoosted && !isBoosting && boostOptions.length > 0;

            return (
              <View key={item.id} style={styles.manageCard}>
                <ListingCard
                  listing={{
                    id: item.id,
                    title: item.title,
                    price: `${item.priceCurrency} ${item.priceAmount}`,
                    category: item.categoryPath ?? "other",
                    location: getRegionLabel(item.region ?? item.seller?.city, t),
                    image: item.thumbnailUrl ?? item.imageUrls[0] ?? "",
                  }}
                  onPress={() => router.push(`/listings/${item.id}`)}
                  style={styles.cardFull}
                />

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      flags.isSold && styles.statusBadgeSold,
                      (flags.isHidden || flags.isDeleted) && styles.statusBadgeHidden,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        flags.isSold && styles.statusBadgeTextSold,
                        (flags.isHidden || flags.isDeleted) && styles.statusBadgeTextHidden,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                {!flags.isDeleted ? (
                  <View style={styles.statusActions}>
                    {flags.isSold || flags.isHidden ? (
                      <TouchableOpacity
                        style={[styles.statusButton, isStatusUpdating && styles.statusButtonDisabled]}
                        disabled={isStatusUpdating}
                        onPress={() => onStatusChange(item, "active")}
                        accessibilityRole="button"
                      >
                        <Text style={styles.statusButtonLabel}>
                          {isStatusUpdating
                            ? t("common.actions.updating", { defaultValue: "Updating..." })
                            : t("listings.actions.relist", { defaultValue: "Relist" })}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            styles.statusButtonSuccess,
                            isStatusUpdating && styles.statusButtonDisabled,
                          ]}
                          disabled={isStatusUpdating}
                          onPress={() => onStatusChange(item, "sold")}
                          accessibilityRole="button"
                        >
                          <Text style={styles.statusButtonLabel}>
                            {isStatusUpdating
                              ? t("common.actions.updating", { defaultValue: "Updating..." })
                              : t("listings.actions.markSold", { defaultValue: "Mark sold" })}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            styles.statusButtonSecondary,
                            isStatusUpdating && styles.statusButtonDisabled,
                          ]}
                          disabled={isStatusUpdating}
                          onPress={() => onStatusChange(item, "hidden")}
                          accessibilityRole="button"
                        >
                          <Text style={styles.statusButtonLabel}>
                            {isStatusUpdating
                              ? t("common.actions.updating", { defaultValue: "Updating..." })
                              : t("listings.actions.hide", { defaultValue: "Hide" })}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.boostButton, !canBoost && styles.boostButtonDisabled]}
                  disabled={!canBoost}
                  onPress={() => onBoostPress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t("monetization.boostFor", { defaultValue: "Boost listing" })}
                >
                  <Text style={styles.boostButtonLabel}>
                    {!flags.isActive
                      ? t("listings.status.unavailable", { defaultValue: "Unavailable" })
                      : item.isBoosted
                        ? t("monetization.boosted", { defaultValue: "Boosted" })
                        : isBoosting
                          ? t("monetization.creatingPayment", { defaultValue: "Creating payment..." })
                          : boostOptions.length > 0
                            ? t("monetization.boostFor", { defaultValue: "Boost listing" })
                            : t("monetization.boost", { defaultValue: "Boost" })}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    loadingContainer: {
      paddingVertical: 20,
      alignItems: "center",
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 16,
    },
    manageCard: {
      width: "48%",
      gap: 8,
    },
    cardFull: {
      width: "100%",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      backgroundColor: theme.successBackground,
      borderWidth: 1,
      borderColor: theme.success,
    },
    statusBadgeSold: {
      backgroundColor: theme.dangerBackground,
      borderColor: theme.danger,
    },
    statusBadgeHidden: {
      backgroundColor: theme.surfaceMuted,
      borderColor: theme.border,
    },
    statusBadgeText: {
      color: theme.success,
      fontSize: 11,
      fontWeight: "800",
    },
    statusBadgeTextSold: {
      color: theme.danger,
    },
    statusBadgeTextHidden: {
      color: theme.textMuted,
    },
    statusActions: {
      flexDirection: "row",
      gap: 8,
    },
    statusButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    statusButtonSuccess: {
      backgroundColor: theme.success,
    },
    statusButtonSecondary: {
      backgroundColor: theme.textMuted,
    },
    statusButtonDisabled: {
      opacity: 0.6,
    },
    statusButtonLabel: {
      color: theme.primaryForeground,
      fontSize: 11,
      fontWeight: "800",
      textAlign: "center",
    },
    boostButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primary,
      paddingHorizontal: 10,
      paddingVertical: 9,
      alignItems: "center",
    },
    boostButtonDisabled: {
      opacity: 0.6,
    },
    boostButtonLabel: {
      color: theme.primaryForeground,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
    },
  });
