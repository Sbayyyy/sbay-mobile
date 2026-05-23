import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { Skeleton } from "@/components/common/Skeleton";

type Props = {
  count?: number;
};

function RowSkeleton() {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.hairline }]}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Skeleton height={14} width="50%" />
          <Skeleton height={12} width={40} />
        </View>
        <Skeleton height={12} width="75%" />
      </View>
    </View>
  );
}

export function ConversationRowSkeleton({ count = 6 }: Props) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
