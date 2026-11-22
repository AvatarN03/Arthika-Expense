import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from '../themed-text';

const categories = ['Food', 'Transport', 'Bills', 'Shopping', 'Other'];
const sources = ['Main bank account', 'Everyday cash'];

type AddExpenseFormProps = {
  onClose: () => void;
};

export function AddExpenseForm({ onClose }: AddExpenseFormProps) {
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [source, setSource] = useState(sources[0]);
  const [date, setDate] = useState('22 Nov 2026');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const parsedAmount = Number(amount);

    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a positive expense amount.');
      setSaved(false);
      return;
    }

    setError(null);
    setSaved(true);
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: theme.background }}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="heading">Add expense</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Preview flow · data is not stored yet
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

            <Card style={styles.amountCard}>
              <ThemedText type="label" themeColor="textSecondary">
                Amount
              </ThemedText>
              <View style={styles.amountRow}>
                <ThemedText type="amount">₹</ThemedText>
                <TextInput
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    setError(null);
                    setSaved(false);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  accessibilityLabel="Expense amount"
                  style={[styles.amountInput, { color: theme.text }]}
                />
              </View>
            </Card>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Category</ThemedText>
              <View style={styles.chipRow}>
                {categories.map((item) => {
                  const selected = category === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setCategory(item);
                        setSaved(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.chip,
                        { borderColor: theme.border },
                        selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small" themeColor={selected ? 'primaryForeground' : 'text'}>
                        {item}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Money source</ThemedText>
              <View style={styles.optionGroup}>
                {sources.map((item) => {
                  const selected = source === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setSource(item);
                        setSaved(false);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={({ pressed }) => [
                        styles.option,
                        { borderColor: theme.border },
                        selected && { borderColor: theme.primary, backgroundColor: theme.backgroundElement },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold">{item}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {selected ? 'Selected' : 'Use this source'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Date</ThemedText>
              <Input
                value={date}
                onChangeText={(value) => {
                  setDate(value);
                  setSaved(false);
                }}
                placeholder="DD MMM YYYY"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Expense date"
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="label">Description (optional)</ThemedText>
              <Input
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setSaved(false);
                }}
                placeholder="What was this for?"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                accessibilityLabel="Expense description"
                style={styles.descriptionInput}
              />
            </View>

            {error && (
              <ThemedText themeColor="destructive" accessibilityRole="alert">
                {error}
              </ThemedText>
            )}
            {saved && (
              <ThemedText themeColor="positive" accessibilityRole="alert">
                Preview accepted. Nothing has been saved.
              </ThemedText>
            )}

            <Button label={saved ? 'Preview accepted' : 'Save expense'} onPress={handleSave} disabled={saved} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  headerText: { flex: 1 },
  closeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.medium },
  pressed: { opacity: 0.72 },
  amountCard: { gap: Spacing.two },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  amountInput: { flex: 1, fontSize: 32, lineHeight: 38, fontWeight: '700', padding: 0 },
  fieldGroup: { gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderRadius: Radii.medium, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  optionGroup: { gap: Spacing.two },
  option: { borderWidth: 1, borderRadius: Radii.medium, padding: Spacing.three, gap: Spacing.one },
  descriptionInput: { minHeight: 88, textAlignVertical: 'top' },
});
