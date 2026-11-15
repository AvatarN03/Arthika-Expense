import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from '../themed-text';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  accessory?: ReactNode;
};

export function SectionHeader({ title, subtitle, accessory }: SectionHeaderProps) {
  return (
    <View style={{ gap: Spacing.one }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText type="heading">{title}</ThemedText>
        {accessory}
      </View>
      {subtitle && (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}
