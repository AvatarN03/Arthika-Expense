/**
 * ReconciliationHistory — a sheet listing all past reconciliations for one source.
 *
 * Shows date, previous balance → entered balance, difference (with sign and colour),
 * and any note attached to the reconciliation. Opens from the source card in the
 * Sources screen.
 */
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Radii, Spacing } from "@/constants/theme";
import { useDatabase } from "@/database/database-provider";
import {
    createReconciliationRepository,
    type Reconciliation,
} from "@/database/repositories/reconciliations";
import { useTheme } from "@/hooks/use-theme";
import { formatMinor } from "@/lib/money";

import { ThemedText } from "../themed-text";

type ReconciliationHistoryProps = {
  sourceId: string;
  sourceName: string;
  currencyCode: string;
  onClose: () => void;
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReconciliationHistory({
  sourceId,
  sourceName,
  currencyCode,
  onClose,
}: ReconciliationHistoryProps) {
  const theme = useTheme();
  const client = useDatabase();
  const repository = createReconciliationRepository(client);

  const [records, setRecords] = useState<Reconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    repository
      .list(sourceId)
      .then((list) => {
        if (!active) return;
        setRecords(list);
        setLoadError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoadError(
          cause instanceof Error
            ? cause.message
            : "Unable to load reconciliation history.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // repository is recreated only when client changes; sourceId is stable per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="heading">Reconciliation history</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {sourceName}
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="heading" themeColor="textSecondary">
              ×
            </ThemedText>
          </Pressable>
        </View>

        {/* ── Loading / error ── */}
        {isLoading ? (
          <Card style={styles.messageCard}>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="small" themeColor="textSecondary">
                Loading history…
              </ThemedText>
            </View>
          </Card>
        ) : loadError ? (
          <Card style={styles.messageCard}>
            <ThemedText themeColor="destructive" accessibilityRole="alert">
              {loadError}
            </ThemedText>
          </Card>
        ) : (
          <>
            <SectionHeader
              title="Past reconciliations"
              subtitle={`${records.length} record${records.length === 1 ? "" : "s"}`}
            />

            {records.length === 0 ? (
              <EmptyState
                title="No reconciliations yet"
                description="Balance updates and cash counts for this source will appear here."
              />
            ) : (
              <Card style={styles.listCard}>
                {records.map((rec, index) => {
                  const diff = rec.differenceMinor;
                  const diffColor =
                    diff > 0
                      ? "positive"
                      : diff < 0
                        ? "destructive"
                        : "textSecondary";
                  const diffSign = diff > 0 ? "+" : "";
                  const isLast = index === records.length - 1;

                  return (
                    <View
                      key={rec.id}
                      style={[
                        styles.row,
                        !isLast && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        },
                      ]}
                    >
                      {/* Left: date + balances + note */}
                      <View style={styles.rowLeft}>
                        <ThemedText type="smallBold">
                          {formatDate(rec.createdAt)}
                        </ThemedText>

                        <View style={styles.balanceRow}>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatMinor(
                              rec.previousBalanceMinor,
                              currencyCode,
                            )}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {" "}
                            →{" "}
                          </ThemedText>
                          <ThemedText type="small">
                            {formatMinor(rec.enteredBalanceMinor, currencyCode)}
                          </ThemedText>
                        </View>

                        {rec.reason ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {rec.reason}
                          </ThemedText>
                        ) : null}
                      </View>

                      {/* Right: difference */}
                      <View style={styles.diffCol}>
                        <ThemedText type="smallBold" themeColor={diffColor}>
                          {diff === 0
                            ? "No change"
                            : `${diffSign}${formatMinor(Math.abs(diff), currencyCode)}`}
                        </ThemedText>
                        {diff !== 0 && (
                          <ThemedText type="small" themeColor="textSecondary">
                            {diff > 0 ? "credited" : "debited"}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  headerText: { flex: 1 },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.medium,
  },
  pressed: { opacity: 0.72 },
  messageCard: { gap: Spacing.two },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  listCard: { padding: 0, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowLeft: { flex: 1, gap: Spacing.one },
  balanceRow: { flexDirection: "row", alignItems: "center" },
  diffCol: { alignItems: "flex-end", gap: Spacing.half },
});
