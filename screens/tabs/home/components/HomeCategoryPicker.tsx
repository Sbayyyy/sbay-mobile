import { memo, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  FilterChipOption,
  HorizontalFilterChips,
} from "@/components/common/HorizontalFilterChips";
import { SectionHeader } from "@/components/common/SectionHeader";
import { type ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

type HomeCategoryPickerProps = {
  categories: FilterChipOption[];
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
};

export const HomeCategoryPicker = memo(function HomeCategoryPicker({
  categories,
  activeCategory,
  onSelectCategory,
}: HomeCategoryPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const selectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    setDialogOpen(false);
  };

  return (
    <>
      <SectionHeader
        title={t("home.categoriesTitle")}
        actionLabel={t("common.actions.seeAll")}
        onActionPress={() => setDialogOpen(true)}
      />

      <HorizontalFilterChips
        options={categories}
        activeId={activeCategory}
        onSelect={selectCategory}
      />

      <Modal
        visible={dialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDialogOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDialogOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t("home.categoriesTitle")}</Text>
            <ScrollView contentContainerStyle={styles.modalList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.modalItem}
                  onPress={() => selectCategory(category.id)}
                >
                  <Text style={styles.modalItemLabel}>{category.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
});

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 18,
      maxHeight: "80%",
      gap: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    modalList: {
      gap: 8,
    },
    modalItem: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: theme.surfaceMuted,
    },
    modalItemLabel: {
      color: theme.text,
      fontWeight: "600",
    },
  });
