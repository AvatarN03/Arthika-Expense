import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';

const sources = [
  { name: 'Main bank account', type: 'Bank account', balance: '₹42,500' },
  { name: 'Everyday cash', type: 'Cash', balance: '₹3,200' },
];

const recentActivity = [
  { title: 'Groceries', meta: 'Today · Food', amount: '− ₹840' },
  { title: 'Moved to cash', meta: 'Yesterday · Transfer', amount: '₹2,000' },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/arthika-logo-horizontal-color.png')}
              contentFit="contain"
              style={styles.logo}
              accessibilityLabel="ARTHIKA"
            />
            <ThemedText type="small" themeColor="textSecondary">
              Sunday, 15 November
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

          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <AmountDisplay label="Spent this month" amount="₹8,420" />
              <ThemedText type="small" themeColor="textSecondary">
                November
              </ThemedText>
            </Card>
            <Card style={styles.summaryCard}>
              <AmountDisplay label="Upcoming commitments" amount="₹12,000" />
              <ThemedText type="small" themeColor="textSecondary">
                Next 30 days
              </ThemedText>
            </Card>
          </View>

          <View style={styles.actions}>
            <Button label="Add expense" />
            <Button label="Transfer" variant="secondary" />
            <Button label="Update balance" variant="ghost" />
          </View>

          <View style={styles.section}>
            <SectionHeader title="Money sources" accessory={<ThemedText type="link">View all</ThemedText>} />
            <Card>
              {sources.map((source) => (
                <View key={source.name} style={styles.listRow}>
                  <View>
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
                  <View>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { alignItems: 'flex-start', gap: Spacing.two },
  logo: { width: 156, height: 40 },
  greeting: { gap: Spacing.one },
  balanceCard: { gap: Spacing.two },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryCard: { flex: 1, padding: Spacing.three },
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
