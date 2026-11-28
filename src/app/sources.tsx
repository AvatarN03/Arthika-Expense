import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CashReconciliation } from "@/components/sources/cash-reconciliation";
import { UpdateBalance } from "@/components/sources/update-balance";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AmountDisplay } from "@/components/ui/amount-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Radii, Spacing } from "@/constants/theme";
import { useDatabase } from "@/database/database-provider";
import {
    createMoneySourceRepository,
    type CreateMoneySource,
    type MoneySource,
    type MoneySourceType,
} from "@/database/repositories/money-sources";
import {
    createTransactionRepository,
    type TransactionLedgerEntry,
} from "@/database/repositories/transactions";
import { calculateTrackedBalances } from "@/domain/balance";
import { useTheme } from "@/hooks/use-theme";
import { formatMinor, parseMajorToMinor } from "@/lib/money";

const typeLabel: Record<MoneySourceType, string> = {
  bank: "Bank account",
  cash: "Cash",
  wallet: "Wallet",
};

export default function SourcesScreen() {
  const theme = useTheme();
  const client = useDatabase();
  const sourceRepository = useMemo(
    () => createMoneySourceRepository(client),
    [client],
  );
  const transactionRepository = useMemo(
    () => createTransactionRepository(client),
    [client],
  );

  const [sources, setSources] = useState<MoneySource[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<TransactionLedgerEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddVisible, setAddVisible] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updateTargetId, setUpdateTargetId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      transactionRepository.listLedgerEntries(),
      sourceRepository.list({ includeArchived: true }),
    ])
      .then(([entries, sourceList]) => {
        if (!active) return;
        setSources(sourceList);
        setLedgerEntries(entries);
        setLoadError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setLoadError(
          cause instanceof Error
            ? cause.message
            : "Unable to load money sources.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sourceRepository, transactionRepository, refreshKey]);

  const balances = useMemo(
    () => calculateTrackedBalances(sources, ledgerEntries),
    [sources, ledgerEntries],
  );
  const activeSources = useMemo(
    () => sources.filter((source) => !source.isArchived),
    [sources],
  );
  const activeBalances = useMemo(() => {
    const activeIds = new Set(activeSources.map((source) => source.id));
    return calculateTrackedBalances(
      activeSources,
      ledgerEntries.filter((entry) => activeIds.has(entry.sourceId)),
    );
  }, [activeSources, ledgerEntries]);
  const balanceById = useMemo(
    () =>
      new Map(balances.sources.map((balance) => [balance.sourceId, balance])),
    [balances],
  );
  const updateTarget = useMemo(
    () => sources.find((source) => source.id === updateTargetId) ?? null,
    [sources, updateTargetId],
  );

  const visible = showArchived ? sources : activeSources;
  const activeCount = activeSources.length;

  function refresh() {
    setIsLoading(true);
    setLoadError(null);
    setRefreshKey((value) => value + 1);
  }

  async function handleArchive(id: string) {
    if (pendingArchiveId) return;
    setPendingArchiveId(id);
    setActionError(null);
    try {
      await sourceRepository.archive(id);
      refresh();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Unable to archive this source.",
      );
    } finally {
      setPendingArchiveId(null);
    }
  }

  async function handleCreate(input: CreateMoneySource) {
    await sourceRepository.create(input);
    refresh();
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title">Money sources</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Bank accounts, cash, and wallets you track.
            </ThemedText>
          </View>

          {isLoading && sources.length === 0 ? (
            <Card style={styles.messageCard}>
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Loading money sources…
                </ThemedText>
              </View>
            </Card>
          ) : loadError ? (
            <Card style={styles.messageCard}>
              <ThemedText themeColor="destructive" accessibilityRole="alert">
                {loadError}
              </ThemedText>
              <Button label="Try again" variant="secondary" onPress={refresh} />
            </Card>
          ) : (
            <>
              <Card style={styles.totalCard}>
                {activeBalances.totals.length === 0 ? (
                  <AmountDisplay label="Total tracked balance" amount="—" />
                ) : (
                  activeBalances.totals.map((total) => (
                    <AmountDisplay
                      key={total.currencyCode}
                      label={
                        activeBalances.totals.length > 1
                          ? `Total tracked balance · ${total.currencyCode}`
                          : "Total tracked balance"
                      }
                      amount={formatMinor(total.totalMinor, total.currencyCode)}
                    />
                  ))
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {activeCount === 0
                    ? "No active sources"
                    : `Across ${activeCount} active source${activeCount === 1 ? "" : "s"}`}
                </ThemedText>
              </Card>

              <View style={styles.actions}>
                <Button
                  label="Add source"
                  onPress={() => setAddVisible(true)}
                />
                <Pressable
                  onPress={() => setShowArchived((value) => !value)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.toggle,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" themeColor="primary">
                    {showArchived ? "Hide archived" : "Show archived"}
                  </ThemedText>
                </Pressable>
              </View>

              {actionError && (
                <ThemedText themeColor="destructive" accessibilityRole="alert">
                  {actionError}
                </ThemedText>
              )}

              <View style={styles.section}>
                <SectionHeader
                  title="Sources"
                  subtitle={
                    showArchived ? "Including archived" : "Active sources"
                  }
                  accessory={
                    <ThemedText type="small" themeColor="textSecondary">
                      {isLoading ? "Refreshing…" : visible.length}
                    </ThemedText>
                  }
                />

                {visible.length === 0 ? (
                  <EmptyState
                    title="No sources yet"
                    description="Add a bank account, cash, or wallet to start tracking."
                  />
                ) : (
                  <View style={styles.list}>
                    {visible.map((source) => {
                      const balanceMinor =
                        balanceById.get(source.id)?.balanceMinor ??
                        source.openingBalanceMinor;
                      const isArchiving = pendingArchiveId === source.id;

                      return (
                        <Card key={source.id} style={styles.sourceCard}>
                          <View style={styles.sourceRow}>
                            <View
                              style={[
                                styles.typeBadge,
                                { backgroundColor: theme.backgroundElement },
                              ]}
                            >
                              <ThemedText type="smallBold" themeColor="primary">
                                {typeLabel[source.type]}
                              </ThemedText>
                            </View>
                            {source.isArchived && (
                              <View
                                style={[
                                  styles.archivedBadge,
                                  { borderColor: theme.border },
                                ]}
                              >
                                <ThemedText
                                  type="small"
                                  themeColor="textSecondary"
                                >
                                  Archived
                                </ThemedText>
                              </View>
                            )}
                          </View>

                          <View style={styles.sourceBody}>
                            <View style={styles.sourceDetails}>
                              <ThemedText type="smallBold">
                                {source.name}
                              </ThemedText>
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                              >
                                {source.currencyCode}
                              </ThemedText>
                            </View>
                            <ThemedText type="heading">
                              {formatMinor(balanceMinor, source.currencyCode)}
                            </ThemedText>
                          </View>

                          {!source.isArchived && (
                            <View style={styles.sourceActions}>
                              <Button
                                label={
                                  source.type === "cash"
                                    ? "Count cash"
                                    : "Update balance"
                                }
                                variant="secondary"
                                onPress={() => setUpdateTargetId(source.id)}
                              />
                              <Pressable
                                onPress={() => {
                                  void handleArchive(source.id);
                                }}
                                disabled={pendingArchiveId !== null}
                                accessibilityRole="button"
                                accessibilityState={{
                                  disabled: pendingArchiveId !== null,
                                }}
                                style={({ pressed }) => [
                                  styles.archiveButton,
                                  pressed && styles.pressed,
                                  pendingArchiveId !== null && styles.disabled,
                                ]}
                              >
                                <ThemedText
                                  type="small"
                                  themeColor="destructive"
                                >
                                  {isArchiving ? "Archiving…" : "Archive"}
                                </ThemedText>
                              </Pressable>
                            </View>
                          )}
                        </Card>
                      );
                    })}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isAddVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddVisible(false)}
      >
        {isAddVisible && (
          <AddSourceForm
            onClose={() => setAddVisible(false)}
            onSave={handleCreate}
          />
        )}
      </Modal>

      <Modal
        visible={updateTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setUpdateTargetId(null)}
      >
        {updateTarget && updateTarget.type === "cash" ? (
          <CashReconciliation
            sourceId={updateTarget.id}
            sourceName={updateTarget.name}
            currencyCode={updateTarget.currencyCode}
            balanceMinor={
              balanceById.get(updateTarget.id)?.balanceMinor ??
              updateTarget.openingBalanceMinor
            }
            onClose={() => {
              setUpdateTargetId(null);
              refresh();
            }}
            onSaved={() => {
              setUpdateTargetId(null);
              refresh();
            }}
          />
        ) : updateTarget ? (
          <UpdateBalance
            sourceId={updateTarget.id}
            sourceName={updateTarget.name}
            currencyCode={updateTarget.currencyCode}
            balanceMinor={
              balanceById.get(updateTarget.id)?.balanceMinor ??
              updateTarget.openingBalanceMinor
            }
            onClose={() => {
              setUpdateTargetId(null);
              refresh();
            }}
            onSaved={() => {
              setUpdateTargetId(null);
              refresh();
            }}
          />
        ) : null}
      </Modal>
    </ThemedView>
  );
}

type AddSourceFormProps = {
  onClose: () => void;
  onSave: (input: CreateMoneySource) => Promise<void>;
};

function AddSourceForm({ onClose, onSave }: AddSourceFormProps) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [type, setType] = useState<MoneySourceType>("bank");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  async function handleSave() {
    if (savingRef.current) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Source name is required.");
      return;
    }

    let openingBalanceMinor: number;
    try {
      openingBalanceMinor = parseMajorToMinor(balance);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Enter a valid opening balance.",
      );
      return;
    }
    if (openingBalanceMinor < 0) {
      setError("Opening balance must be zero or greater.");
      return;
    }

    const currencyCode = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setError("Use a three-letter currency code such as INR.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        type,
        openingBalanceMinor,
        currencyCode,
      });
      onClose();
    } catch (cause) {
      savingRef.current = false;
      setError(
        cause instanceof Error ? cause.message : "Unable to save this source.",
      );
      setIsSaving(false);
    }
  }

  const types: MoneySourceType[] = ["bank", "cash", "wallet"];

  return (
    <SafeAreaView style={styles.modalScreen}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : Platform.OS === "android"
              ? "height"
              : undefined
        }
        style={styles.modalScreen}
      >
        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <ThemedText type="heading">Add source</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Track a new bank account, cash, or wallet.
              </ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <ThemedText type="heading" themeColor="textSecondary">
                ×
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="label">Name</ThemedText>
            <Input
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              editable={!isSaving}
              placeholder="e.g. Main bank account"
              accessibilityLabel="Source name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="label">Type</ThemedText>
            <View style={styles.chipRow}>
              {types.map((item) => {
                const selected = type === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setType(item);
                      setError(null);
                    }}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: isSaving }}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: theme.border },
                      selected && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                      pressed && styles.pressed,
                      isSaving && styles.disabled,
                    ]}
                  >
                    <ThemedText
                      type="small"
                      themeColor={selected ? "primaryForeground" : "text"}
                    >
                      {typeLabel[item]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="label">Opening balance</ThemedText>
            <Input
              value={balance}
              onChangeText={(value) => {
                setBalance(value);
                setError(null);
              }}
              editable={!isSaving}
              keyboardType="decimal-pad"
              placeholder="0.00"
              accessibilityLabel="Opening balance"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Zero or greater, with up to two decimal places.
            </ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="label">Currency code</ThemedText>
            <Input
              value={currency}
              onChangeText={(value) => {
                setCurrency(value);
                setError(null);
              }}
              editable={!isSaving}
              placeholder="INR"
              autoCapitalize="characters"
              maxLength={3}
              accessibilityLabel="Currency code"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Three letters, for example INR.
            </ThemedText>
          </View>

          {error && (
            <ThemedText themeColor="destructive" accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Button
            label={isSaving ? "Saving…" : "Save source"}
            onPress={handleSave}
            disabled={isSaving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: { gap: Spacing.one },
  messageCard: { gap: Spacing.three, alignItems: "flex-start" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  totalCard: { gap: Spacing.two },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    flexWrap: "wrap",
  },
  toggle: { minHeight: 48, justifyContent: "center" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  section: { gap: Spacing.two },
  list: { gap: Spacing.three },
  sourceCard: { gap: Spacing.three },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.small,
  },
  archivedBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.small,
    borderWidth: 1,
  },
  sourceBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  sourceDetails: { flex: 1, gap: Spacing.half },
  sourceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  archiveButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  modalScreen: { flex: 1 },
  modalContent: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  modalHeaderText: { flex: 1 },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.medium,
  },
  fieldGroup: { gap: Spacing.two },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radii.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
