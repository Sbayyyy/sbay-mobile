import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { ListingCard } from "@/components/listings/ListingCard";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getSellerListings, type Listing as ApiListing } from "@/services/listings";
import { getSellerProfile, type SellerProfile } from "@/services/user";
import { getSellerReviews, type Review, type ReviewStats } from "@/services/reviews";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=60";

type TabId = "listings" | "reviews";

export default function SellerProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("listings");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getSellerProfile(id),
      getSellerListings(id),
      getSellerReviews(id, 1, 10),
    ])
      .then(([profileData, listingData, reviewData]) => {
        if (!isMounted) return;
        setProfile(profileData);
        setListings(listingData);
        setReviews(reviewData.reviews);
        setStats(reviewData.stats);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load seller.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const displayListings = useMemo(
    () =>
      listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: `${listing.priceCurrency} ${listing.priceAmount}`,
        category: listing.categoryPath ?? "other",
        image:
          listing.thumbnailUrl ??
          listing.imageUrls?.[0] ??
          "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=60",
      })),
    [listings],
  );

  const ratingValue = stats?.averageRating ?? profile?.rating ?? 0;
  const reviewTotal = stats?.totalReviews ?? profile?.reviewCount ?? 0;

  const ratingDistribution = useMemo(() => {
    const dist = stats?.ratingDistribution ?? {};
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: dist[String(star)] ?? 0,
    }));
  }, [stats]);

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  if (!profile || error) {
    return (
      <AppScreen>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Seller unavailable</Text>
          <Text style={styles.emptySubtitle}>{error ?? "Please try again."}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonLabel}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButtonInline} onPress={() => router.back()}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: profile.avatar ?? FALLBACK_IMAGE }}
              style={styles.avatar}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const star = index + 1;
                return (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(ratingValue) ? "star" : "star-outline"}
                    size={16}
                    color={star <= Math.round(ratingValue) ? "#FBBF24" : theme.textMuted}
                  />
                );
              })}
              <Text style={styles.ratingValue}>{ratingValue.toFixed(1)}</Text>
              <Text style={styles.ratingMeta}>{reviewTotal} reviews</Text>
            </View>
            {profile.city ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                <Text style={styles.metaText}>{profile.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              Alert.alert("Contact seller", "Messaging is not available yet.")
            }
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonLabel}>Contact seller</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, styles.outlineButton]}
            onPress={() =>
              Alert.alert("Report seller", "Reporting is not available yet.")
            }
          >
            <Ionicons name="flag-outline" size={18} color={theme.danger} />
            <Text style={styles.outlineButtonLabel}>Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Items sold</Text>
            <Text style={styles.statValue}>{profile.totalOrders}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Member since</Text>
            <Text style={styles.statValue}>
              {new Date(profile.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Positive</Text>
            <Text style={styles.statValue}>
              {ratingValue > 0 ? Math.round((ratingValue / 5) * 100) : 0}%
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "listings" && styles.tabButtonActive]}
            onPress={() => setTab("listings")}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "listings" && styles.tabLabelActive,
              ]}
            >
              Listings ({displayListings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "reviews" && styles.tabButtonActive]}
            onPress={() => setTab("reviews")}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "reviews" && styles.tabLabelActive,
              ]}
            >
              Reviews ({reviewTotal})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "listings" ? (
          displayListings.length ? (
            <View style={styles.grid}>
              {displayListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={() => router.push(`/listings/${listing.id}`)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>
                This seller has no active listings.
              </Text>
            </View>
          )
        ) : (
          <View style={styles.reviewsWrap}>
            <View style={styles.reviewSummary}>
              <Text style={styles.reviewSummaryTitle}>Rating breakdown</Text>
              {ratingDistribution.map((item) => {
                const total = reviewTotal || 1;
                const percent = Math.round((item.count / total) * 100);
                return (
                  <View key={item.star} style={styles.reviewRow}>
                    <Text style={styles.reviewStarLabel}>{item.star}★</Text>
                    <View style={styles.reviewBarTrack}>
                      <View
                        style={[
                          styles.reviewBarFill,
                          { width: `${percent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.reviewPercent}>{percent}%</Text>
                  </View>
                );
              })}
            </View>

            {reviews.length ? (
              <View style={styles.reviewList}>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View>
                        <Text style={styles.reviewName}>{review.reviewerName}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.reviewStars}>
                        {Array.from({ length: 5 }).map((_, index) => {
                          const star = index + 1;
                          return (
                            <Ionicons
                              key={star}
                              name={star <= review.rating ? "star" : "star-outline"}
                              size={14}
                              color={star <= review.rating ? "#FBBF24" : theme.textMuted}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <Text style={styles.reviewBody}>{review.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reviews yet</Text>
                <Text style={styles.emptySubtitle}>
                  This seller has not received reviews yet.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      paddingBottom: 40,
      gap: 16,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyState: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 30,
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
    },
    backButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surfaceMuted,
    },
    backButtonInline: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
    },
    backButtonLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
    },
    headerCard: {
      flexDirection: "row",
      gap: 16,
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 18,
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    avatarWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: "hidden",
      backgroundColor: theme.surfaceMuted,
    },
    avatar: {
      width: "100%",
      height: "100%",
    },
    headerInfo: {
      flex: 1,
      gap: 6,
    },
    name: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    ratingValue: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text,
    },
    ratingMeta: {
      fontSize: 12,
      color: theme.textMuted,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    statRow: {
      flexDirection: "row",
      gap: 12,
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
    },
    primaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },
    primaryButtonLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: "#fff",
    },
    outlineButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: theme.danger,
    },
    outlineButtonLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.danger,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.surfaceMuted,
      borderRadius: 14,
      padding: 12,
      gap: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textMuted,
    },
    statValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },
    tabRow: {
      flexDirection: "row",
      gap: 12,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
      alignItems: "center",
    },
    tabButtonActive: {
      backgroundColor: theme.primary,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
    },
    tabLabelActive: {
      color: theme.primaryForeground,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 16,
    },
    reviewsWrap: {
      gap: 16,
    },
    reviewSummary: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    reviewSummaryTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.text,
    },
    reviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    reviewStarLabel: {
      width: 32,
      fontSize: 12,
      color: theme.textMuted,
    },
    reviewBarTrack: {
      flex: 1,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
      overflow: "hidden",
    },
    reviewBarFill: {
      height: "100%",
      backgroundColor: theme.primary,
    },
    reviewPercent: {
      width: 40,
      fontSize: 12,
      color: theme.textMuted,
      textAlign: "right",
    },
    reviewList: {
      gap: 12,
    },
    reviewCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    reviewHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    reviewName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },
    reviewDate: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    reviewStars: {
      flexDirection: "row",
      gap: 2,
    },
    reviewBody: {
      fontSize: 13,
      color: theme.textMuted,
    },
  });
