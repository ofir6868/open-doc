import React, { useEffect, useState } from 'react';
import {
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ChevronRight20Regular, ChevronDown20Regular } from '@fluentui/react-icons';
import { FieldNode } from './FieldNode';
import type { SchemaDefinition, SchemaNode } from '@open-doc/shared';

const useStyles = makeStyles({
  group: {
    marginBottom: tokens.spacingVerticalXS,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    cursor: 'pointer',
    userSelect: 'none',
    borderRadius: tokens.borderRadiusMedium,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  groupLabel: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  children: {
    paddingLeft: tokens.spacingHorizontalL,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    padding: tokens.spacingHorizontalM,
  },
});

/** Does this node (or any descendant leaf) match the query by full dotted path? */
function nodeMatches(node: SchemaNode, prefix: string, q: string): boolean {
  if (!q) return true;
  if (typeof node === 'string') return prefix.toLowerCase().includes(q);
  return Object.entries(node).some(([k, child]) => nodeMatches(child, `${prefix}.${k}`, q));
}

interface GroupProps {
  name: string;
  node: SchemaNode;
  prefix: string;
  query: string;
  defaultOpen: boolean;
  inserted: Set<string>;
  onInsert: (path: string) => void;
}

function SchemaGroup({ name, node, prefix, query, defaultOpen, inserted, onInsert }: GroupProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(defaultOpen);

  // Reset collapse state when an expand/collapse-all toggles the default.
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen]);

  if (typeof node === 'string') {
    return <FieldNode fieldPath={prefix} fieldType={node} inserted={inserted.has(prefix)} onInserted={onInsert} />;
  }

  // While searching, force groups open so matches are visible.
  const effectiveOpen = query ? true : open;
  const entries = Object.entries(node).filter(([k, child]) => nodeMatches(child, `${prefix}.${k}`, query));

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader} onClick={() => setOpen((o) => !o)}>
        {effectiveOpen ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
        <Text className={styles.groupLabel}>{name}</Text>
      </div>
      {effectiveOpen && (
        <div className={styles.children}>
          {entries.map(([key, child]) => (
            <SchemaGroup
              key={key}
              name={key}
              node={child}
              prefix={`${prefix}.${key}`}
              query={query}
              defaultOpen={defaultOpen}
              inserted={inserted}
              onInsert={onInsert}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  schema: SchemaDefinition;
  query: string;
  defaultOpen: boolean;
  inserted: Set<string>;
  onInsert: (path: string) => void;
}

export function SchemaTree({ schema, query, defaultOpen, inserted, onInsert }: Props) {
  const styles = useStyles();

  if (Object.keys(schema).length === 0) {
    return <Text className={styles.empty}>Schema is empty.</Text>;
  }

  const q = query.trim().toLowerCase();
  const entries = Object.entries(schema).filter(([k, node]) => nodeMatches(node, k, q));

  if (entries.length === 0) {
    return <Text className={styles.empty}>No fields match “{query}”.</Text>;
  }

  return (
    <div>
      {entries.map(([key, node]) => (
        <SchemaGroup
          key={key}
          name={key}
          node={node}
          prefix={key}
          query={q}
          defaultOpen={defaultOpen}
          inserted={inserted}
          onInsert={onInsert}
        />
      ))}
    </div>
  );
}
