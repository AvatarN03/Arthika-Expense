import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from '../themed-text';

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, variant = 'primary', style, disabled, accessibilityState, ...props }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      style={(state) => [
        styles.base,
        { backgroundColor: variant === 'primary' ? theme.primary : 'transparent' },
        variant === 'secondary' && { borderColor: theme.border, borderWidth: 1 },
        variant === 'ghost' && styles.ghost,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <ThemedText
        type="smallBold"
        themeColor={variant === 'primary' ? 'primaryForeground' : 'primary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
