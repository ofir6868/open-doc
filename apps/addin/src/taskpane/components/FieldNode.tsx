import React, { useState } from 'react';
import {
  Button,
  Text,
  Tooltip,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import { insertContentControl } from '../hooks/useWord';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
  },
  label: {
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyMonospace,
  },
  labelPlaced: {
    color: tokens.colorNeutralForeground3,
  },
  placedIcon: {
    color: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  typeBadge: {
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  fieldPath: string;
  fieldType: string;
  inserted: boolean;
  onInserted: (path: string) => void;
}

export function FieldNode({ fieldPath, fieldType, inserted, onInserted }: Props) {
  const styles = useStyles();
  const [loading, setLoading] = useState(false);

  const handleInsert = async () => {
    // Only show loading if the insertion takes longer than 200ms
    const loadingTimeout = setTimeout(() => {
      setLoading(true);
    }, 200);

    try {
      await insertContentControl(fieldPath);
      onInserted(fieldPath);
    } catch (e) {
      console.error('Insert failed', e);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  const shortName = fieldPath.split('.').pop() ?? fieldPath;

  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <Tooltip content={fieldPath} relationship="label">
          <Text size={200} className={`${styles.label} ${inserted ? styles.labelPlaced : ''}`}>
            {shortName}
          </Text>
        </Tooltip>
      </div>
      <div className={styles.right}>
        <Text size={100} className={styles.typeBadge}>
          {fieldType}
        </Text>
        {loading ? (
          <Spinner size="extra-tiny" />
        ) : (
          <Button
            size="small"
            appearance="subtle"
            icon={<Add16Regular />}
            onClick={handleInsert}
            title="Insert at cursor"
          />
        )}
      </div>
    </div>
  );
}
