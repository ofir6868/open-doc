import React from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { DocumentText24Regular, AlertUrgent24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalM,
    height: '400px',
    color: tokens.colorNeutralForeground3,
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    height: '400px',
    color: tokens.colorPaletteRedForeground1,
    padding: tokens.spacingHorizontalXL,
    textAlign: 'center',
  },
  iframe: {
    border: 'none',
    width: '100%',
    height: '100%',
    flex: 1,
    backgroundColor: 'white',
  },
});

interface Props {
  html: string | null;
  loading?: boolean;
  error?: string;
}

export function DocPreviewPane({ html, loading, error }: Props) {
  const s = useStyles();

  if (loading) {
    return (
      <div className={s.root}>
        <div className={s.loading}>
          <Spinner size="large" label="Generating preview..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.root}>
        <div className={s.error}>
          <AlertUrgent24Regular style={{ fontSize: '48px' }} />
          <Text size={400} weight="semibold">Failed to render preview</Text>
          <Text size={200}>{error}</Text>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className={s.root}>
        <div className={s.loading}>
          <DocumentText24Regular style={{ fontSize: '48px' }} />
          <Text>No preview available</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <iframe
        className={s.iframe}
        title="Document Preview"
        sandbox="allow-same-origin"
        srcDoc={html}
      />
    </div>
  );
}
