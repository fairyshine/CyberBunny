import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

interface ToolStatusBannerProps {
  status: string;
}

export default function ToolStatusBanner({ status }: ToolStatusBannerProps) {
  const theme = useTheme();

  if (!status) return null;

  return (
    <View style={styles.container}>
      <Chip
        icon="cog"
        mode="outlined"
        style={[styles.chip, { borderColor: theme.colors.primary }]}
        textStyle={{ color: theme.colors.primary, fontSize: 12 }}
      >
        {status}
      </Chip>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  chip: {
    height: 28,
  },
});
