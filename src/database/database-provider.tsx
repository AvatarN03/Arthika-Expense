import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

import type { DatabaseClient } from './client';
import { getAppDatabase } from './connection';

const DatabaseContext = createContext<DatabaseClient | null>(null);
type DatabaseState =
  | { status: 'loading' }
  | { status: 'ready'; client: DatabaseClient }
  | { status: 'error' };

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatabaseState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getAppDatabase().then(
      (client) => { if (active) setState({ status: 'ready', client }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    // The shared connection outlives screens. Never close it on remount.
    return () => { active = false; };
  }, [attempt]);

  if (state.status === 'ready') {
    return <DatabaseContext value={state.client}>{children}</DatabaseContext>;
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.message}>
        <ThemedText type="heading" accessibilityLiveRegion="polite">
          {state.status === 'error' ? 'Unable to open local storage' : 'Opening local storage…'}
        </ThemedText>
        {state.status === 'error' && (
          <>
            <ThemedText themeColor="textSecondary">
              Please try again. Your stored data has not been reset.
            </ThemedText>
            <Button label="Try again" onPress={() => {
              setState({ status: 'loading' });
              setAttempt((value) => value + 1);
            }} />
          </>
        )}
      </View>
    </ThemedView>
  );
}

export function useDatabase(): DatabaseClient {
  const client = useContext(DatabaseContext);
  if (!client) throw new Error('useDatabase must be used inside a ready DatabaseProvider.');
  return client;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  message: { width: '100%', maxWidth: 420, gap: Spacing.three },
});
