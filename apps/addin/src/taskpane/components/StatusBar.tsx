import React from 'react';
import { Badge, Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  dot: { flexShrink: 0 },
  text: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

interface Props {
  connected: boolean;
  serverUrl: string;
}

export function StatusBar({ connected, serverUrl }: Props) {
  const styles = useStyles();
  return (
    <div className={styles.bar}>
      <Badge
        className={styles.dot}
        color={connected ? 'success' : 'danger'}
        appearance="filled"
        size="small"
      />
      <Text size={200} className={styles.text} title={serverUrl}>
        {connected ? `Connected — ${serverUrl}` : 'Disconnected'}
      </Text>
    </div>
  );
}
