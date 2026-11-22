import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Match the server's initial theme, then subscribe to the native/browser scheme. */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
