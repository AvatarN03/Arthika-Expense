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

type EmiStatus = 'upcoming' | 'due-today' | 'overdue' | 'paid' | 'skipped';

type Emi = {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  status: EmiStatus;
  source: string;
};

const statusLabel: Record<EmiStatus, string> = {
  upcoming: 'Upcoming',
  'due-today': 'Due today',
  overdue: 'Overdue',
  paid: 'Paid',
  skipped: 'Skipped',
};

const statusColor: Record<EmiStatus, 'textSecondary' | 'warning' | 'destructive' | 'positive' | 'textSecondary'> = {
  upcoming: 'textSecondary',
  'due-today': 'warning',
  overdue: 'destructive',
  paid: 'positive',
  skipped: 'textSecondary',
};

const initialEmis: Emi[] = [
  { id: '1', name: 'Home loan EMI', amount: '₹24,000', dueDate: '28 Nov 2026', status: 'upcoming', source: 'Main bank account' },
  { id: '2', name: 'Car loan EMI', amount: '₹8,500', dueDate: '30 Nov 2026', status: 'upcoming', source: 'Main bank account' },
  { id: '3', name: 'Phone EMI', amount: '₹2,200', dueDate: '22 Nov 2026', status: 'due-today', source: 'Everyday cash' },
  { id: '4', name: 'Insurance premium', amount: '₹6,000', dueDate: '10 Nov 2026', status: 'overdue', source: 'Main bank account' },
];

export default function EmisScreen() {
  const theme = useTheme();
  const [emis, setEmis] = useState<Emi[]>(initialEmis);
  const [isAddVisible, setAddVisible] = useState(false);

  const upcoming = emis.filter((e) => e.status === 'upcoming' || e.status === 'due-today' || e.status === 'overdue');

  function handleMarkPaid(id: string) {
    setEmis((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: 'paid' } : e)),
    );
  }

  function handleAdd(emi: Emi) {
    setEmis((prev) => [...prev, emi]);
    setAddVisible(false);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">EMIs</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Upcoming commitments and payment history.
            </ThemedText>
          </View>

          <Card style={styles.summaryCard}>
            <AmountDisplay label="Upcoming commitments" amount="₹40,700" size="compact" />
            <ThemedText type="small" themeColor="textSecondary">
              Next 30 days · {upcoming.length} unpaid
            </ThemedText>
          </Card>

          <View style={styles.actions}>
            <Button label="Add EMI" onPress={() => setAddVisible(true)} />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="Active"
              subtitle="Unpaid occurrences"
              accessory={
                <ThemedText type="small" themeColor="textSecondary">
                  {upcoming.length}
                </ThemedText>
              }
            />

            {upcoming.length === 0 ? (
              <EmptyState
                title="No upcoming EMIs"
                description="Add a commitment to track upcoming payments."
              />
            ) : (
              <View style={styles.list}>
                {upcoming.map((emi) => (
                  <Card key={emi.id} style={styles.emiCard}>
                    <View style={styles.emiHeader}>
                      <View style={styles.emiDetails}>
                        <ThemedText type="smallBold">{emi.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {emi.source} · Due {emi.dueDate}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: theme.backgroundElement },
                        ]}>
                        <ThemedText type="small" themeColor={statusColor[emi.status]}>
                          {statusLabel[emi.status]}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.emiFooter}>
                      <ThemedText type="heading">{emi.amount}</ThemedText>
                      <Button
                        label="Mark paid"
                        variant="secondary"
                        onPress={() => handleMarkPaid(emi.id)}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>

          {emis.some((e) => e.status === 'paid') && (
            <View style={styles.section}>
              <SectionHeader title="Paid" subtitle="Confirmed payments" />
              <View style={styles.list}>
                {emis
                  .filter((e) => e.status === 'paid')
                  .map((emi) => (
                    <Card key={emi.id} style={styles.emiCard}>
                      <View style={styles.emiHeader}>
                        <View style={styles.emiDetails}>
                          <ThemedText type="smallBold">{emi.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {emi.source} · Paid
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: theme.backgroundElement },
                          ]}>
                          <ThemedText type="small" themeColor="positive">
                            Paid
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText type="heading">{emi.amount}</ThemedText>
                    </Card>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={isAddVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddVisible(false)}>
        <AddEmiForm onClose={() => setAddVisible(false)} onAdd={handleAdd} />
      </Modal>
    </ThemedView>
  );
}

type AddEmiFormProps = {
  onClose: () => void;
  onAdd: (emi: Emi) => void;
};

function AddEmiForm({ onClose, onAdd }: AddEmiFormProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [source, setSource] = useState('Main bank account');
  const [error, setError] = useState<string | null>(null);

  const sources = ['Main bank account', 'Everyday cash', 'Travel wallet'];

  function handleSave() {
    if (!name.trim()) {
      setError('EMI name is required.');
      return;
    }
    const parsed = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!dueDate.trim()) {
      setError('Due date is required.');
      return;
    }
    setError(null);
    onAdd({
      id: String(Date.now()),
      name: name.trim(),
      amount: `₹${parsed.toLocaleString('en-IN')}`,
      dueDate: dueDate.trim(),
      status: 'upcoming',
      source,
    });
  }

  return (
    <SafeAreaView style={styles.modalScreen}>
      <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderText}>
            <ThemedText type="heading">Add EMI</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Track an upcoming commitment.
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
            placeholder="e.g. Home loan EMI"
            accessibilityLabel="EMI name"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="label">Amount</ThemedText>
          <Input
            value={amount}
            onChangeText={(v) => {
              setAmount(v);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel="EMI amount"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="label">Due date</ThemedText>
          <Input
            value={dueDate}
            onChangeText={(v) => {
              setDueDate(v);
              setError(null);
            }}
            placeholder="DD MMM YYYY"
            accessibilityLabel="Due date"
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="label">Money source</ThemedText>
          <View style={styles.optionGroup}>
            {sources.map((item) => {
              const selected = source === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setSource(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={({ pressed }) => [
                    styles.option,
                    { borderColor: theme.border },
                    selected && { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">{item}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && (
          <ThemedText themeColor="destructive" accessibilityRole="alert">
            {error}
          </ThemedText>
        )}

        <Button label="Save EMI" onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one },
  summaryCard: { gap: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  pressed: { opacity: 0.72 },
  section: { gap: Spacing.two },
  list: { gap: Spacing.three },
  emiCard: { gap: Spacing.three },
  emiHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  emiDetails: { flex: 1, gap: Spacing.half },
  statusBadge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.small },
  emiFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  modalScreen: { flex: 1 },
  modalContent: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  modalHeaderText: { flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.medium },
  fieldGroup: { gap: Spacing.two },
  optionGroup: { gap: Spacing.two },
  option: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.three, gap: Spacing.one },
});
