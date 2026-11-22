import { Image } from 'expo-image';
import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddExpenseForm } from '@/components/expenses/add-expense-form';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const sources = [
  { name: 'Main bank account', type: 'Bank account', balance: '₹42,500' },
  { name: 'Everyday cash', type: 'Cash', balance: '₹3,200' },
];

const recentActivity = [
  { title: 'Groceries', meta: 'Today · Food', amount: '− ₹840' },
  { title: 'Moved to cash', meta: 'Yesterday · Transfer', amount: '₹2,000' },
];

export default function HomeScreen() {
  const [isAddExpenseVisible, setAddExpenseVisible] = useState(false);
  const scheme = useColorScheme();
  const { width, fontScale } = useWindowDimensions();
  const stackSummaries = width < 360 || fontScale > 1.2;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={scheme === 'dark'
                ? require('@/assets/images/arthika-logo-horizontal-reversed.png')
                : require('@/assets/images/arthika-logo-horizontal-color.png')}
              contentFit="contain"
              style={styles.logo}
              accessibilityLabel="ARTHIKA"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Sample overview · November
            </ThemedText>
          </View>

          <View style={styles.greeting}>
            <ThemedText type="title">Your money</ThemedText>
            <ThemedText themeColor="textSecondary">
              A clear view of what you have and what needs attention.
            </ThemedText>
          </View>

          <Card style={styles.balanceCard}>
            <AmountDisplay label="Total tracked balance" amount="₹45,700" />
            <ThemedText type="small" themeColor="textSecondary">
              Across 2 money sources · placeholder data
            </ThemedText>
          </Card>

          <View style={[styles.summaryRow, stackSummaries && styles.stacked]}>
            <Card style={styles.summaryCard}>
              <AmountDisplay label="Spent this month" amount="₹8,420" size="compact" />
              <ThemedText type="small" themeColor="textSecondary">
                November
              </ThemedText>
            </Card>
            <Card style={styles.summaryCard}>
              <AmountDisplay label="Upcoming commitments" amount="₹12,000" size="compact" />
              <ThemedText type="small" themeColor="textSecondary">
                Next 30 days
              </ThemedText>
            </Card>
          </View>

          <View style={styles.actions}>
            <Button label="Add expense" onPress={() => setAddExpenseVisible(true)} />
            <Button label="Transfer" variant="secondary" disabled />
            <Button label="Update balance" variant="ghost" disabled />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Money sources" accessory={<ThemedText type="link">View all</ThemedText>} />
            <Card>
              {sources.map((source) => (
                <View key={source.name} style={styles.listRow}>
                  <View style={styles.rowDetails}>
                    <ThemedText type="smallBold">{source.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {source.type}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{source.balance}</ThemedText>
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Recent activity" accessory={<ThemedText type="link">View all</ThemedText>} />
            <Card>
              {recentActivity.map((activity) => (
                <View key={activity.title} style={styles.listRow}>
                  <View style={styles.rowDetails}>
                    <ThemedText type="smallBold">{activity.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {activity.meta}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{activity.amount}</ThemedText>
                </View>
              ))}
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
      <Modal
        visible={isAddExpenseVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddExpenseVisible(false)}>
        <AddExpenseForm onClose={() => setAddExpenseVisible(false)} />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { alignItems: 'flex-start', gap: Spacing.two },
  logo: { width: 156, height: 40 },
  greeting: { gap: Spacing.one },
  balanceCard: { gap: Spacing.two },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  stacked: { flexDirection: 'column' },
  summaryCard: { flex: 1, minWidth: 0, padding: Spacing.three },
  rowDetails: { flex: 1 },
  actions: { gap: Spacing.two },
  section: { gap: Spacing.two },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
});
