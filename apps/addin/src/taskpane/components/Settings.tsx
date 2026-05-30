import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

interface Props {
  serverUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}

export function Settings({ serverUrl, onSave, onClose }: Props) {
  const styles = useStyles();
  const [url, setUrl] = useState(serverUrl);

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <Label htmlFor="server-url" size="small" weight="semibold">
          Server URL
        </Label>
        <Input
          id="server-url"
          value={url}
          onChange={(_, d) => setUrl(d.value)}
          placeholder="http://localhost:3000"
        />
      </div>
      <div className={styles.actions}>
        <Button appearance="primary" size="small" onClick={() => onSave(url)}>
          Save
        </Button>
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
