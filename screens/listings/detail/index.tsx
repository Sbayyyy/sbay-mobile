import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppScreen } from "@/components/layout/AppScreen";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  deleteListing,
  getListing,
  type Listing as ApiListing,
} from "@/services/listings";
import { getStoredToken } from "@/services/auth";
import { getMyProfile } from "@/services/user";
import { addFavorite, getFavorites, removeFavorite } from "@/services/favorites";
import { openChat } from "@/services/messages";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80";
// TODO: Replace with real domain when universal links are set up.
const SHARE_BASE_URL = "https://TODO_DOMAIN";

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [listing, setListing] = useState<ApiListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getStoredToken()
      .then((token) => {
        if (!token) return;
        return getMyProfile();
      })
      .then((profile) => {
        if (!isMounted || !profile) return;
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
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Unable to load listing.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [id]);

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
          <Text style={styles.emptyTitle}>Listing unavailable</Text>
          <Text style={styles.emptySubtitle}>
            {error ?? "Please try again."}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonLabel}>Go back</Text>
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
    New: "New",
    LikeNew: "Like new",
    Good: "Good",
    Fair: "Fair",
    Poor: "Poor",
    Used: "Used",
    Refurbished: "Refurbished",
  };

  const isAvailable = listing.stock === undefined || listing.stock > 0;
  const sellerProfileId = listing.seller?.id ?? listing.sellerId ?? null;
  const isOwnListing =
    !!profileId && (listing.sellerId === profileId || listing.seller?.id === profileId);

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
      Alert.alert(
        "Delete failed",
        err instanceof Error ? err.message : "Unable to delete listing.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };
const handleContactSeller = async () => {
  if (openingChat) return;

  try {
    const token = await getStoredToken();
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to message the seller.");
      return;
    }

    const sellerId = sellerProfileId;
    if (!sellerId || !listing?.id) {
      Alert.alert("Contact seller", "Seller information is missing.");
      return;
    }

    setOpeningChat(true);

    const { chatId } = await openChat({
      otherUserId: sellerId,
      listingId: listing.id,
    });

    router.push(`/chats/thread/${chatId}`);
  } catch (err) {
    Alert.alert(
      "Unable to open chat",
      err instanceof Error ? err.message : "Please try again later.",
    );
  } finally {
    setOpeningChat(false);
  }
};
  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButtonInline} onPress={() => router.back()}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </TouchableOpacity>

        <View style={styles.gallery}>
          <View style={styles.heroImageWrap}>
            <Image
              source={{ uri: imageUrls[selectedImageIndex] ?? imageUrl }}
              style={styles.heroImage}
            />
            {imageUrls.length > 1 ? (
              <>
                <TouchableOpacity
                  style={[styles.navButton, styles.navLeft]}
                  onPress={() =>
                    setSelectedImageIndex((prev) =>
                      prev === 0 ? imageUrls.length - 1 : prev - 1,
                    )
                  }
                >
                  <Ionicons name="chevron-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navButton, styles.navRight]}
                  onPress={() =>
                    setSelectedImageIndex((prev) =>
                      prev === imageUrls.length - 1 ? 0 : prev + 1,
                    )
                  }
                >
                  <Ionicons name="chevron-forward" size={22} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.counterBadge}>
                  <Text style={styles.counterLabel}>
                    {selectedImageIndex + 1} / {imageUrls.length}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {imageUrls.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.thumbRow}>
                {imageUrls.map((url, index) => {
                  const active = index === selectedImageIndex;
                  return (
                    <TouchableOpacity
                      key={`${url}-${index}`}
                      onPress={() => setSelectedImageIndex(index)}
                      style={[styles.thumb, active && styles.thumbActive]}
                    >
                      <Image source={{ uri: url }} style={styles.thumbImage} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{listing.title}</Text>
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
                Alert.alert("Sign in required", "Please sign in to favorite items.");
                return;
              }
              const nextValue = !isFavorite;
              setIsFavorite(nextValue);
              setFavoriteLoading(true);
              try {
                if (nextValue) {
                  await addFavorite(listing.id);
                } else {
                  await removeFavorite(listing.id);
                }
                const refreshed = await getFavorites();
                setIsFavorite(refreshed.some((item) => item.id === listing.id));
              } catch (err) {
                setIsFavorite(!nextValue);
                Alert.alert(
                  "Favorite failed",
                  err instanceof Error ? err.message : "Unable to update favorite.",
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
              {isFavorite ? "Favorited" : "Favorite"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              try {
                const shareUrl = `${SHARE_BASE_URL}/listings/${listing.id}`;
                const message = `Check out what I found on SBAY, ${listing.title}:\n${shareUrl}`;
                await Share.share({
                  title: listing.title,
                  message,
                });
              } catch {
                Alert.alert("Share failed", "Unable to share this listing.");
              }
            }}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.primary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          {listing.condition ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>
                {conditionLabels[listing.condition] ?? listing.condition}
              </Text>
            </View>
          ) : null}
          {listing.region ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>{listing.region}</Text>
            </View>
          ) : null}
          {listing.categoryPath ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>{listing.categoryPath}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionBody}>{listing.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {listing.categoryPath ?? "Uncategorized"}
              </Text>
            </View>
            {listing.condition ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Condition</Text>
                <Text style={styles.detailValue}>
                  {conditionLabels[listing.condition] ?? listing.condition}
                </Text>
              </View>
            ) : null}
            {listing.region ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{listing.region}</Text>
              </View>
            ) : null}
            {listing.stock != null ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>{listing.stock}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
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
                />
              ) : (
                <Text style={styles.sellerInitial}>
                  {(listing.seller?.name ?? "U").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionBody}>
                {listing.seller?.name ?? "Unknown seller"}
              </Text>
              {listing.seller ? (
                <Text style={styles.sectionMeta}>
                  Rating {listing.seller.rating.toFixed(1)} ·{" "}
                  {listing.seller.reviewCount} reviews
                </Text>
              ) : null}
            </View>
            {sellerProfileId ? (
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {!isAvailable ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>Item is currently unavailable.</Text>
            </View>
          ) : null}

{!isOwnListing ? (
  <TouchableOpacity
    style={[styles.primaryButton, openingChat && { opacity: 0.7 }]}
    onPress={handleContactSeller}
    disabled={openingChat}
  >
    {openingChat ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
    )}
    <Text style={styles.primaryButtonLabel}>
      {openingChat ? "Opening..." : "Contact seller"}
    </Text>
  </TouchableOpacity>
)  : (
            <View style={styles.ownerActions}>
              <View style={styles.noticeBannerInfo}>
                <Text style={styles.noticeInfoText}>This is your listing.</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push(`/add_listing?id=${listing.id}`)}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonLabel}>Edit listing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.dangerButton]}
                onPress={handleDeleteListing}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonLabel}>
                  {deleteLoading ? "Deleting..." : "Delete listing"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialogOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete listing?</Text>
            <Text style={styles.modalBody}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setDeleteDialogOpen(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    gallery: {
      gap: 12,
    },
    heroImageWrap: {
      position: "relative",
    },
    heroImage: {
      width: "100%",
      height: 260,
      borderRadius: 18,
      backgroundColor: theme.surfaceMuted,
    },
    navButton: {
      position: "absolute",
      top: "45%",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    navLeft: {
      left: 12,
    },
    navRight: {
      right: 12,
    },
    counterBadge: {
      position: "absolute",
      bottom: 12,
      alignSelf: "center",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    counterLabel: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "600",
    },
    thumbRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 4,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "transparent",
    },
    thumbActive: {
      borderColor: theme.primary,
    },
    thumbImage: {
      width: "100%",
      height: "100%",
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
    },
    price: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.success,
    },
    actionRow: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.surfaceMuted,
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
      gap: 8,
    },
    metaChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.surfaceMuted,
    },
    metaChipLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    section: {
      gap: 6,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    sectionBody: {
      fontSize: 14,
      color: theme.textMuted,
      lineHeight: 20,
    },
    sectionMeta: {
      fontSize: 12,
      color: theme.textSubtle,
    },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    detailItem: {
      width: "47%",
      backgroundColor: theme.surfaceMuted,
      borderRadius: 12,
      padding: 12,
      gap: 4,
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
      gap: 12,
    },
    sellerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#FDECEC",
    },
    noticeText: {
      color: "#B42318",
      fontWeight: "600",
      textAlign: "center",
    },
    noticeBannerInfo: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#E9F2FF",
    },
    noticeInfoText: {
      color: "#175CD3",
      fontWeight: "600",
      textAlign: "center",
    },
    primaryButton: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.primary,
    },
    dangerButton: {
      backgroundColor: theme.danger,
    },
    primaryButtonLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: "#fff",
    },
    ownerActions: {
      gap: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 10,
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
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: 24,
    },
    modalCard: {
      width: "100%",
      borderRadius: 16,
      padding: 20,
      backgroundColor: theme.surface,
      gap: 12,
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
