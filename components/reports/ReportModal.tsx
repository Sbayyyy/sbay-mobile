import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { ChipPicker } from "@/components/form/ChipPicker";
import { resolveMediaUrl } from "@/services/media";
import { uploadImageAsync } from "@/services/uploads";
import { createReport, type ReportReason, type ReportTargetType } from "@/services/reports";

type ReportModalProps = {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
};

const MAX_EVIDENCE = 5;

export function ReportModal({ visible, targetType, targetId, onClose }: ReportModalProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [reason, setReason] = useState<ReportReason>("Spam");
  const [description, setDescription] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setReason("Spam");
    setDescription("");
    setBlockUser(false);
    setEvidence([]);
    setError(null);
    setUploading(false);
    setSubmitting(false);
  }, [visible, targetId, targetType]);

  const reasonOptions = useMemo(
    () => [
      { id: "Spam" as const, label: t("report.reasons.spam") },
      { id: "Harassment" as const, label: t("report.reasons.harassment") },
      { id: "Scam" as const, label: t("report.reasons.scam") },
      { id: "Inappropriate" as const, label: t("report.reasons.inappropriate") },
      { id: "Other" as const, label: t("report.reasons.other") },
    ],
    [t],
  );

  const handleAddEvidence = async () => {
    if (uploading || evidence.length >= MAX_EVIDENCE) return;
    setUploading(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(t("report.errors.upload", { defaultValue: "Failed to upload evidence." }));
      }

      const remaining = MAX_EVIDENCE - evidence.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const uploads = result.assets.slice(0, remaining);
      const uploadedUrls: string[] = [];
      for (const asset of uploads) {
        const fileName = asset.fileName ?? `report-${Date.now()}.jpg`;
        const url = await uploadImageAsync(asset.uri, fileName, asset.mimeType ?? "image/jpeg");
        uploadedUrls.push(url);
      }

      if (uploadedUrls.length) {
        setEvidence((prev) => [...prev, ...uploadedUrls].slice(0, MAX_EVIDENCE));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("report.errors.upload"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmed = description.trim();
    if (reason === "Other" && !trimmed) {
      setError(t("report.errors.description"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createReport({
        targetType,
        targetId,
        reason,
        description: trimmed ? trimmed : null,
        evidenceUrls: evidence,
        blockUser,
      });
      Alert.alert(
        t("report.title"),
        t("report.success", { defaultValue: "Report submitted." }),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("report.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalWrapper}
        >
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.title}>{t("report.title")}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <ChipPicker
                label={t("report.fields.reason")}
                options={reasonOptions}
                value={reason}
                onChange={setReason}
              />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("report.fields.description")}</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("report.fields.descriptionPlaceholder")}
                  placeholderTextColor={theme.inputPlaceholder}
                  multiline
                  style={styles.textArea}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.evidenceHeader}>
                  <Text style={styles.fieldLabel}>{t("report.fields.evidence")}</Text>
                  <Text style={styles.evidenceHint}>
                    {t("report.fields.evidenceHint")}
                  </Text>
                </View>
                <View style={styles.evidenceRow}>
                  {evidence.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.evidenceItem}>
                      <Image source={{ uri: resolveMediaUrl(url) ?? url }} style={styles.evidenceImage} />
                      <TouchableOpacity
                        style={styles.evidenceRemove}
                        onPress={() => handleRemoveEvidence(index)}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {evidence.length < MAX_EVIDENCE ? (
                    <TouchableOpacity style={styles.evidenceAdd} onPress={handleAddEvidence}>
                      {uploading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons name="add" size={20} color={theme.primary} />
                      )}
                      <Text style={styles.evidenceAddLabel}>
                        {t("report.actions.addEvidence")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t("report.fields.blockUser")}</Text>
                <Switch value={blockUser} onValueChange={setBlockUser} />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelLabel}>{t("report.actions.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitLabel}>{t("report.actions.submit")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      padding: 20,
    },
    modalWrapper: {
      flex: 1,
      justifyContent: "center",
    },
    modalCard: {
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 16,
      gap: 12,
      maxHeight: "85%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceMuted,
    },
    content: {
      gap: 16,
      paddingBottom: 4,
    },
    field: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    textArea: {
      minHeight: 100,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.text,
      backgroundColor: theme.surfaceMuted,
      textAlignVertical: "top",
    },
    evidenceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    evidenceHint: {
      fontSize: 12,
      color: theme.textMuted,
    },
    evidenceRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    evidenceItem: {
      width: 72,
      height: 72,
      borderRadius: 12,
      overflow: "hidden",
    },
    evidenceImage: {
      width: "100%",
      height: "100%",
    },
    evidenceRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    evidenceAdd: {
      width: 72,
      height: 72,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: theme.surfaceMuted,
    },
    evidenceAddLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.primary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    switchLabel: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
      paddingRight: 12,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.surfaceMuted,
    },
    cancelLabel: {
      color: theme.text,
      fontWeight: "600",
    },
    submitButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.primary,
      minWidth: 120,
      alignItems: "center",
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitLabel: {
      color: "#fff",
      fontWeight: "600",
    },
  });
