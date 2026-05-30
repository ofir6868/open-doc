import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Input,
  Spinner,
  Text,
  Divider,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Settings24Regular, Search20Regular,
} from '@fluentui/react-icons';
import { StatusBar } from './components/StatusBar';
import { SchemaTree } from './components/SchemaTree';
import { Settings } from './components/Settings';
import { useSchema } from './hooks/useSchema';
import { getConnectedStatus } from './hooks/useWord';
import type { SchemaDefinition, SchemaNode } from '@open-doc/shared';

const DEFAULT_SERVER = 'http://localhost:3000';
const LS_KEY = 'open-doc-server-url';

/** Every leaf field path in the schema, used for the "placed" progress count. */
function collectLeaves(node: SchemaNode, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  return Object.entries(node).flatMap(([k, child]) =>
    collectLeaves(child, prefix ? `${prefix}.${k}` : k),
  );
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: tokens.fontFamilyBase,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brand: {
    fontFamily: "'Fraunces Variable', 'Iowan Old Style', Georgia, serif",
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: tokens.colorNeutralForeground1,
    userSelect: 'none',
    lineHeight: 1,
  },
  brandAccent: { color: tokens.colorBrandForeground1 },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalXS}`,
  },
  toolbar: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
    padding: `0 ${tokens.spacingHorizontalS} ${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
  },
  search: { flex: 1 },
  progress: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: tokens.spacingVerticalM,
    color: tokens.colorNeutralForeground3,
  },
  hint: {
    display: 'block',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

export default function App() {
  const styles = useStyles();
  const [serverUrl, setServerUrl] = useState<string>(
    localStorage.getItem(LS_KEY) ?? DEFAULT_SERVER,
  );
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { schema, loading, error } = useSchema(serverUrl);

  const [query, setQuery] = useState('');
  const [inserted, setInserted] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(true);
  const [treeVersion, setTreeVersion] = useState(0);

  useEffect(() => {
    getConnectedStatus(serverUrl).then(setConnected);
    const id = setInterval(() => getConnectedStatus(serverUrl).then(setConnected), 10000);
    return () => clearInterval(id);
  }, [serverUrl]);

  const leaves = useMemo(
    () => (schema ? collectLeaves(schema as SchemaDefinition) : []),
    [schema],
  );
  const handleInserted = (path: string) =>
    setInserted((prev) => new Set(prev).add(path));

  const setAll = (open: boolean) => {
    setAllOpen(open);
    setTreeVersion((v) => v + 1);
  };

  const handleSaveSettings = (url: string) => {
    const trimmed = url.replace(/\/$/, '');
    localStorage.setItem(LS_KEY, trimmed);
    setServerUrl(trimmed);
    setShowSettings(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.brand}>
          open<span className={styles.brandAccent}>·</span>doc
        </span>
        <Button
          icon={<Settings24Regular />}
          appearance="subtle"
          size="small"
          onClick={() => setShowSettings((s) => !s)}
        />
      </div>

      {showSettings ? (
        <Settings
          serverUrl={serverUrl}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <div className={styles.body}>
          {loading && (
            <div className={styles.center}>
              <Spinner size="small" label="Loading schema…" />
            </div>
          )}
          {error && !loading && (
            <div className={styles.center}>
              <Text>Could not load schema.</Text>
              <Text size={200}>{error}</Text>
              <Button size="small" onClick={() => setShowSettings(true)}>
                Check Settings
              </Button>
            </div>
          )}
          {schema && !loading && (
            <>
              <Text className={styles.hint}>select the text to replace, then click on the desired field</Text>
              <div className={styles.toolbar}>
                <Input
                  className={styles.search}
                  size="small"
                  contentBefore={<Search20Regular />}
                  placeholder="Search fields…"
                  value={query}
                  onChange={(_, d) => setQuery(d.value)}
                />
              </div>
              <Divider />
              <SchemaTree
                key={treeVersion}
                schema={schema}
                query={query}
                defaultOpen={allOpen}
                inserted={inserted}
                onInsert={handleInserted}
              />
            </>
          )}
        </div>
      )}

      <StatusBar connected={connected} serverUrl={serverUrl} />
    </div>
  );
}
