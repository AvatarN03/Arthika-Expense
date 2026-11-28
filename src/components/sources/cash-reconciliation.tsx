/**
 * Cash reconciliation flow — a cash-specific balance update sheet.
 *
 * The underlying data path is identical to UpdateBalance: it calls
 * reconciliationRepository.create() with the same arguments. The difference is
 * the UI framing: "Count your cash" language, a denomination helper (expandable)
 * that totals denominations into the amount field, and cash-appropriate copy.
 *
 * The denomination helper is display-only — only the final total is persisted.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Radii, Spacing } from '@/constants/theme';
import { createReconciliationRepository } from '@/database/repositories/reconciliations';
import { useDatabase } from '@/database/database-provider';
import { useTheme } from '@/hooks/use-theme';
import { formatMinor, parseMajorToMinor } from '@/lib/money';

import { ThemedText } from '../themed-text';

type CashReconciliationProps = {
  sourceId: string;
  sourceName: string;
  currencyCode: string;
  /** Current tracked balance in minor units (integer). */
  balanceMinor: number;
  onClose: () => void;
  onSaved: () => void;
};

/** Common denominations shown in the helper, ordered largest first. */
const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

type DenomState = Record<number, string>;

function initialDenomState(): DenomState {
  return Object.fromEntries(DENOMINATIONS.map((d) => [d, '']));
}

/** Sum all denomination counts × face values into major-unit string, e.g. "1250.00". */
function sumDenominations(denom: DenomState): string {
  let totalMinor = 0;
  for (const face of DENOMINATIONS) {
    const count = parseInt(denom[face] ?? '', 10);
    if (!Number.isNaN(count) && count > 0) {
      totalMinor += face * count;
    }
  }
  // Minor units are whole integers for integer-unit currencies; for decimal
  // currencies the denomination face values are already in major units (e.g.
  // ₹500 = 50000 minor). We store denominations in major unit face values so
  // the total is in major units — just format with two decimals.
  return (totalMinor / 100).toFixed(2);
}

export function CashReconciliation({
  sourceId,
  sourceName,
  currencyCode,
  balanceMinor,
  onClose,
  onSaved,
}: CashReconciliationProps) {
  const theme = useTheme();
  const client = useDatabase();
  const repository = createReconciliationRepository(client);

  const [cashOnHand, setCashOnHand] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDenomHelper, setShowDenomHelper] = useState(false);
  const [denom, setDenom] = useState<DenomState>(initialDenomState);

  const trackedBalance = formatMinor(balanceMinor, currencyCode);

  function handleDenomChange(face: number, value: string) {
    // Allow only non-negative integers
    const cleaned = value.replace(/[^0-9]/g, '');
    const next = { ...denom, [face]: cleaned };
    setDenom(next);
    // Push the total into the main input so the user can see and adjust it
    setCashOnHand(sumDenominations(next));
    setError(null);
    setSaved(false);
  }

  function clearDenomHelper() {
    setDenom(initialDenomState());
    setCashOnHand('');
  }

  async function handleSave() {
    if (isSaving) return;

    let enteredBalanceMinor: number;
    try {
      enteredBalanceMinor = parseMajorToMinor(cashOnHand);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid cash amount.');
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await repository.create({
        sourceId,
        previousBalanceMinor: balanceMinor,
        enteredBalanceMinor,
        currencyCode,
        occurredAt: new Date().toISOString(),
        reason: reason || null,
      });
      setSaved(true);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this cash count.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="heading">Count your cash</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {sourceName}
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
              ]}>
              <ThemedText type="heading" themeColor="textSecondary">×</ThemedText>
            </Pressable>
          </View>

          {/* ── Tracked balance ── */}
          <Card style={styles.summaryCard}>
            <ThemedText type="small" themeColor="textSecondary">Currently tracked</ThemedText>
            <ThemedText type="title">{trackedBalance}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Physical cash in {sourceName} according to your records.
            </ThemedText>
          </Card>

          {/* ── Denomination helper ── */}
          <View style={styles.fieldGroup}>
            <Pressable
              onPress={() => setShowDenomHelper((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showDenomHelper ? 'Hide denomination helper' : 'Show denomination helper'}
              style={({ pressed }) => [styles.helperToggle, pressed && styles.pressed]}>
              <ThemedText type="label" themeColor="primary">
                {showDenomHelper ? '▾ Hide denomination helper' : '▸ Count by denomination'}
              </ThemedText>
            </Pressable>

            {showDenomHelper && (
              <Card style={styles.denomCard}>
                <View style={styles.denomGrid}>
                  {DENOMINATIONS.map((face) => (
                    <View key={face} style={styles.denomRow}>
                      <ThemedText type="small" style={styles.denomLabel}>
                        ×{face}
                      </ThemedText>
                      <Input
                        value={denom[face]}
                        onChangeText={(value) => handleDenomChange(face, value)}
                        editable={!isSaving}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={theme.textSecondary}
                        accessibilityLabel={`Count of ${face} denomination`}
                        style={styles.denomInput}
                      />
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={clearDenomHelper}
                  disabled={isSaving}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.clearButton, pressed && styles.pressed, isSaving && styles.disabled]}>
                  <ThemedText type="small" themeColor="textSecondary">Clear counts</ThemedText>
                </Pressable>
              </Card>
            )}
          </View>

          {/* ── Cash on hand input ── */}
          <View style={styles.fieldGroup}>
            <ThemedText type="label">Cash on hand</ThemedText>
            <Input
              value={cashOnHand}
              onChangeText={(value) => {
                setCashOnHand(value);
                setError(null);
                setSaved(false);
              }}
              editable={!isSaving}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Cash on hand"
              style={styles.input}
            />
            <ThemedText type="small" themeColor="textSecondary">
              The total you count in {sourceName} right now.
              {showDenomHelper ? ' Updated automatically from denomination counts above.' : ''}
            </ThemedText>
          </View>

          {/* ── Reason ── */}
          <View style={styles.fieldGroup}>
            <ThemedText type="label">Note (optional)</ThemedText>
            <Input
              value={reason}
              onChangeText={(value) => { setReason(value); setError(null); setSaved(false); }}
              editable={!isSaving}
              placeholder="Any note about this count?"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Cash count note"
            />
          </View>

          {/* ── Feedback ── */}
          {error && (
            <ThemedText themeColor="destructive" accessibilityRole="alert">{error}</ThemedText>
          )}
          {saved && (
            <ThemedText themeColor="positive" accessibilityRole="alert">Cash count saved.</ThemedText>
          )}

          <Button
            label={isSaving ? 'Saving…' : saved ? 'Saved' : 'Save cash count'}
            onPress={handleSave}
            disabled={isSaving || saved}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerText: { flex: 1 },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  summaryCard: { gap: Spacing.two },
  fieldGroup: { gap: Spacing.two },
  input: { minHeight: 48, borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.two },
  helperToggle: { minHeight: 44, justifyContent: 'center' },
  denomCard: { gap: Spacing.three },
  denomGrid: { gap: Spacing.two },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  denomLabel: {
    width: 56,
    textAlign: 'right',
  },
  denomInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.medium,
    padding: Spacing.two,
  },
  clearButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
});
