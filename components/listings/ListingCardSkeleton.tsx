import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { Skeleton } from "@/components/common/Skeleton";

type Props = {
  count?: number;
};

function CardSkeleton() {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton height={140} borderRadius={12} />
      <View style={styles.body}>
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="50%" />
        <Skeleton height={14} width="40%" />
      </View>
    </View>
  );
}

export function ListingCardSkeleton({ count = 6 }: Props) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  body: {
    padding: 10,
    gap: 6,
  },
});
