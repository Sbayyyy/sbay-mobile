import { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { SectionHeader } from "@/components/common/SectionHeader";
import { AppScreen } from "@/components/layout/AppScreen";
import { ListingCard } from "@/components/listings/ListingCard";
import { MY_LISTINGS } from "@/constants/mockData";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

const profile = {
  name: "Layla Al-Nasir",
  email: "layla@sbay.co",
  location: "Damascus, Syria",
};

export default function MeScreen() {
  const router = useRouter();
  const [isAuthenticated] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const listings = useMemo(() => MY_LISTINGS, []);

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <Text style={styles.screenTitle}>{t("profile.title")}</Text>
      <View style={styles.toolbarActions}>
        <TouchableOpacity style={styles.iconButton}>
          <FontAwesome name="share-alt" size={18} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push("/settings")}
        >
          <FontAwesome name="cog" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <AppScreen>
        <View style={styles.authContainer}>
          {renderToolbar()}
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{t("profile.welcomeBack")}</Text>
            <Text style={styles.authSubtitle}>{t("profile.authSubtitle")}</Text>
            <TextInput
              style={styles.authInput}
              placeholder={t("common.placeholders.email")}
              placeholderTextColor={theme.inputPlaceholder}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.authInput}
              placeholder={t("common.placeholders.password")}
              placeholderTextColor={theme.inputPlaceholder}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonLabel}>{t("common.actions.logIn")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>
                {t("common.actions.createAccount")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {renderToolbar()}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileDetail}>{profile.email}</Text>
            <Text style={styles.profileDetail}>{profile.location}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonLabel}>{t("common.actions.edit")}</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title={t("profile.myListings")}
          actionLabel={t("common.actions.seeAll")}
        />

        {listings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t("common.empty.noListings")}</Text>
            <Text style={styles.emptySubtitle}>
              {t("profile.emptyListingsSubtitle")}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
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
      gap: 16,
      paddingBottom: 40,
    },
    toolbar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.text,
    },
    toolbarActions: {
      flexDirection: "row",
      gap: 12,
    },
    iconButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.surface,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.surface,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLabel: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.chipActiveText,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    profileDetail: {
      fontSize: 14,
      color: theme.textMuted,
    },
    editButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surfaceMuted,
    },
    editButtonLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 16,
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
    },
    authContainer: {
      flex: 1,
      padding: 20,
      gap: 20,
    },
    authCard: {
      padding: 20,
      borderRadius: 18,
      backgroundColor: theme.surface,
      gap: 14,
      shadowColor: theme.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    authTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
    },
    authSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
    },
    authInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.surface,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonLabel: {
      color: theme.primaryForeground,
      fontWeight: "600",
      fontSize: 15,
    },
    secondaryButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryButtonLabel: {
      color: theme.primary,
      fontWeight: "600",
    },
  });
