import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SettingRowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
};

function SettingRow({ title, subtitle, value, onPress, trailing }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.pressed]}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.rowTrailing}>
        {value && (
          <ThemedText type="small" themeColor="textSecondary">
            {value}
          </ThemedText>
        )}
        {trailing}
        {onPress && !trailing && (
          <ThemedText type="small" themeColor="textSecondary">
            ›
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [privacyMode, setPrivacyMode] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [biometrics, setBiometrics] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title">Settings</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Privacy, security, notifications, and backup.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Privacy" />
            <Card style={styles.group}>
              <SettingRow
                title="Privacy mode"
                subtitle="Mask amounts on screen"
                trailing={
                  <Switch
                    value={privacyMode}
                    onValueChange={setPrivacyMode}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={theme.surface}
                    accessibilityLabel="Privacy mode"
                  />
                }
              />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Security" />
            <Card style={styles.group}>
              <SettingRow
                title="App lock"
                subtitle="Require authentication to open"
                trailing={
                  <Switch
                    value={appLock}
                    onValueChange={setAppLock}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={theme.surface}
                    accessibilityLabel="App lock"
                  />
                }
              />
              <SettingRow
                title="Biometrics"
                subtitle="Use fingerprint or face unlock"
                trailing={
                  <Switch
                    value={biometrics}
                    onValueChange={setBiometrics}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={theme.surface}
                    accessibilityLabel="Biometrics"
                    disabled={!appLock}
                  />
                }
              />
              <SettingRow
                title="Auto-lock"
                subtitle="Lock after inactivity"
                value="5 minutes"
                onPress={() => {}}
              />
              <SettingRow
                title="Change PIN"
                subtitle="Update your app PIN"
                onPress={() => {}}
              />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Notifications" />
            <Card style={styles.group}>
              <SettingRow
                title="Payment reminders"
                subtitle="Remind before EMIs are due"
                trailing={
                  <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={theme.surface}
                    accessibilityLabel="Payment reminders"
                  />
                }
              />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Data" />
            <Card style={styles.group}>
              <SettingRow title="Backup" subtitle="Export your data" onPress={() => {}} />
              <SettingRow title="Restore" subtitle="Import from a backup" onPress={() => {}} />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Appearance" />
            <Card style={styles.group}>
              <SettingRow title="Theme" subtitle="Follow system setting" value="System" />
              <SettingRow title="Currency" subtitle="Display currency" value="INR" />
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader title="About" />
            <Card style={styles.group}>
              <SettingRow title="Version" value="1.0.0" />
              <SettingRow title="Privacy policy" onPress={() => {}} />
              <SettingRow title="Terms of service" onPress={() => {}} />
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: Spacing.four, padding: Spacing.four, paddingBottom: Spacing.six },
  header: { gap: Spacing.one },
  section: { gap: Spacing.two },
  group: { padding: 0, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, padding: Spacing.three, minHeight: 56 },
  rowText: { flex: 1, gap: Spacing.half },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pressed: { opacity: 0.72 },
});
