import { type ComponentType, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { captureRef } from "@/lib/view-shot";
import ViewShot from "@/lib/view-shot";

import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";
import { uploadImageAsync } from "@/services/uploads";

const CROP_SIZE = 220;
const PREVIEW_IMAGE_SIZE = 280;
const MAX_PAN = (PREVIEW_IMAGE_SIZE - CROP_SIZE) / 2;

type PendingAvatar = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

type Props = {
  visible: boolean;
  pendingAvatar: PendingAvatar | null;
  uploading: boolean;
  onConfirm: (url: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
  setUploading: (uploading: boolean) => void;
};

export function AvatarCropModal({
  visible,
  pendingAvatar,
  uploading,
  onConfirm,
  onClose,
  onError,
  setUploading,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const isWeb = Platform.OS === "web";

  const viewShotRef = useRef<InstanceType<typeof ViewShot> | null>(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // Track actual numeric values without calling internal APIs
  const panValues = useRef({ x: 0, y: 0 });

  useMemo(() => {
    const listenerId = pan.addListener((value) => {
      panValues.current = value;
    });
    return () => pan.removeListener(listenerId);
  }, [pan]);

  const clampPan = (value: number) => Math.min(MAX_PAN, Math.max(-MAX_PAN, value));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({ x: panValues.current.x, y: panValues.current.y });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          pan.setValue({
            x: clampPan(panValues.current.x),
            y: clampPan(panValues.current.y),
          });
        },
      }),
    [pan],
  );

  const handleClose = () => {
    if (uploading) return;
    pan.setValue({ x: 0, y: 0 });
    onClose();
  };

  const handleConfirm = async () => {
    if (!pendingAvatar || uploading) return;
    setUploading(true);
    try {
      const { x: offsetX, y: offsetY } = panValues.current;

      if (isWeb) {
        const url = await uploadImageAsync(
          pendingAvatar.uri,
          pendingAvatar.fileName,
          pendingAvatar.mimeType,
          {
            circleCrop: true,
            outputSize: 512,
            offsetX,
            offsetY,
            cropSize: CROP_SIZE,
            previewImageSize: PREVIEW_IMAGE_SIZE,
            endpoint: "avatar",
          },
        );
        pan.setValue({ x: 0, y: 0 });
        onConfirm(url);
        return;
      }

      if (!viewShotRef.current) {
        throw new Error(
          t("profile.errors.processAvatar", {
            defaultValue: "Unable to process the selected photo.",
          }),
        );
      }

      const capturedUri = await captureRef(viewShotRef.current, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const fileName = pendingAvatar.fileName
        ? pendingAvatar.fileName.replace(/\.[^/.]+$/, ".png")
        : `avatar-${Date.now()}.png`;
      const url = await uploadImageAsync(capturedUri, fileName, "image/png", {
        endpoint: "avatar",
      });
      pan.setValue({ x: 0, y: 0 });
      onConfirm(url);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : t("profile.errors.uploadAvatar", { defaultValue: "Unable to upload avatar." }),
      );
    } finally {
      setUploading(false);
    }
  };

  const CropShot = (isWeb ? View : ViewShot) as ComponentType<object>;
  const cropShotProps = isWeb
    ? {}
    : {
        ref: viewShotRef,
        options: { format: "png", quality: 1, result: "tmpfile" },
      };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {t("profile.modal.cropTitle", { defaultValue: "Crop avatar" })}
          </Text>
          <Text style={styles.subtitle}>
            {t("profile.modal.cropSubtitle", {
              defaultValue: "Preview how your photo will appear.",
            })}
          </Text>
          <View style={styles.cropFrame}>
            <CropShot {...cropShotProps}>
              <View style={styles.cropCircle}>
                {pendingAvatar?.uri ? (
                  <Animated.View
                    style={[
                      styles.cropImageFrame,
                      { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <Image
                      source={{ uri: pendingAvatar.uri }}
                      style={styles.cropImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ) : null}
              </View>
            </CropShot>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelLabel}>
                {t("profile.actions.cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, uploading && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={t("profile.actions.usePhoto", { defaultValue: "Use photo" })}
            >
              <Text style={styles.confirmLabel}>
                {uploading
                  ? t("profile.actions.uploading", { defaultValue: "Uploading..." })
                  : t("profile.actions.usePhoto", { defaultValue: "Use photo" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textMuted,
    },
    cropFrame: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    cropCircle: {
      width: CROP_SIZE,
      height: CROP_SIZE,
      borderRadius: CROP_SIZE / 2,
      overflow: "hidden",
      backgroundColor: "transparent",
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cropImageFrame: {
      width: PREVIEW_IMAGE_SIZE,
      height: PREVIEW_IMAGE_SIZE,
    },
    cropImage: {
      width: "100%",
      height: "100%",
    },
    actions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    cancelLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    confirmButton: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surfaceMuted,
    },
    confirmButtonDisabled: {
      opacity: 0.6,
    },
    confirmLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.primary,
    },
  });
