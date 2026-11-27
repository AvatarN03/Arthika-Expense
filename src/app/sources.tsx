import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SourceType = 'bank' | 'cash' | 'wallet';

type Source = {
  id: string;
  name: string;
  type: SourceType;
  balance: string;
  currency: string;
  archived: boolean;
};

const typeLabel: Record<SourceType, string> = {
  bank: 'Bank account',
  cash: 'Cash',
  wallet: 'Wallet',
};

const initialSources: Source[] = [
  { id: '1', name: 'Main bank account', type: 'bank', balance: '₹42,500', currency: 'INR', archived: false },
  { id: '2', name: 'Everyday cash', type: 'cash', balance: '₹3,200', currency: 'INR', archived: false },
  { id: '3', name: 'Travel wallet', type: 'wallet', balance: '₹1,800', currency: 'INR', archived: false },
];

export default function SourcesScreen() {
  const theme = useTheme();
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [showArchived, setShowArchived] = useState(false);
  const [isAddVisible, setAddVisible] = useState(false);

  const visible = showArchived ? sources : sources.filter((s) => !s.archived);

  function handleArchive(id: string) {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, archived: true } : s)),
    );
  }

  function handleAdd(source: Source) {
    setSources((prev) => [...prev, source]);
    setAddVisible(false);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">Money sources</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Bank accounts, cash, and wallets you track.
            </ThemedText>
          </View>

          <Card style={styles.totalCard}>
            <AmountDisplay
              label="Total tracked balance"
              amount="₹47,500"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Across {sources.filter((s) => !s.archived).length} active source
              {sources.filter((s) => !s.archived).length === 1 ? '' : 's'}
            </ThemedText>
          </Card>

          <View style={styles.actions}>
            <Button label="Add source" onPress={() => setAddVisible(true)} />
            <Pressable
              onPress={() => setShowArchived((v) => !v)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="primary">
                {showArchived ? 'Hide archived' : 'Show archived'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Sources"
              subtitle={showArchived ? 'Including archived' : 'Active sources'}
              accessory={
                <ThemedText type="small" themeColor="textSecondary">
                  {visible.length}
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
                {visible.map((source) => (
                  <Card key={source.id} style={styles.sourceCard}>
                    <View style={styles.sourceRow}>
                      <View style={[styles.typeBadge, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="smallBold" themeColor="primary">
                          {typeLabel[source.type]}
                        </ThemedText>
                      </View>
                      {source.archived && (
                        <View style={[styles.archivedBadge, { borderColor: theme.border }]}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Archived
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.sourceBody}>
                      <View style={styles.sourceDetails}>
                        <ThemedText type="smallBold">{source.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {source.currency}
                        </ThemedText>
                      </View>
                      <ThemedText type="heading">{source.balance}</ThemedText>
                    </View>

                    {!source.archived && (
                      <View style={styles.sourceActions}>
                        <Button label="Update balance" variant="secondary" disabled />
                        <Pressable
                          onPress={() => handleArchive(source.id)}
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>
                          <ThemedText type="small" themeColor="destructive">
                            Archive
                          </ThemedText>
                        </Pressable>
                      </View>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isAddVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddVisible(false)}>
        <AddSourceForm onClose={() => setAddVisible(false)} onAdd={handleAdd} />
      </Modal>
    </ThemedView>
  );
}

type AddSourceFormProps = {
  onClose: () => void;
  onAdd: (source: Source) => void;
};

function AddSourceForm({ onClose, onAdd }: AddSourceFormProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('bank');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) {
      setError('Source name is required.');
      return;
    }
    const parsed = Number(balance);
    if (!balance.trim() || !Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid opening balance.');
      return;
    }
    setError(null);
    onAdd({
      id: String(Date.now()),
      name: name.trim(),
      type,
      balance: `₹${parsed.toLocaleString('en-IN')}`,
      currency: currency.trim().toUpperCase() || 'INR',
      archived: false,
    });
  }

  const types: SourceType[] = ['bank', 'cash', 'wallet'];

  return (
    <SafeAreaView style={styles.modalScreen}>
      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderText}>
            <ThemedText type="heading">Add source</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Track a new bank account, cash, or wallet.
            </ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.closeButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="heading" themeColor="textSecondary">
              ×
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="label">Name</ThemedText>
          <Input
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError(null);
            }}
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
                  onPress={() => setType(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor={selected ? 'primaryForeground' : 'text'}>
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
            onChangeText={(v) => {
              setBalance(v);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel="Opening balance"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="label">Currency code</ThemedText>
          <Input
            value={currency}
            onChangeText={(v) => setCurrency(v)}
            placeholder="INR"
            autoCapitalize="characters"
            maxLength={3}
            accessibilityLabel="Currency code"
          />
        </View>

        {error && (
          <ThemedText themeColor="destructive" accessibilityRole="alert">
            {error}
          </ThemedText>
        )}

        <Button label="Save source" onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one },
  totalCard: { gap: Spacing.two },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  toggle: { minHeight: 48, justifyContent: 'center' },
  pressed: { opacity: 0.72 },
  section: { gap: Spacing.two },
  list: { gap: Spacing.three },
  sourceCard: { gap: Spacing.three },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.small },
  archivedBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.small, borderWidth: 1 },
  sourceBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  sourceDetails: { flex: 1, gap: Spacing.half },
  sourceActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  archiveButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.two },
  modalScreen: { flex: 1 },
  modalContent: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  modalHeaderText: { flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.medium },
  fieldGroup: { gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderRadius: Radii.medium, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
