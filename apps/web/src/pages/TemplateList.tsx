import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Text, Badge, Spinner, makeStyles, tokens,
  Table, TableHeader, TableRow, TableHeaderCell,
  TableBody, TableCell, Tooltip, Input,
  Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuButton,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions,
} from '@fluentui/react-components';
import { toast } from 'sonner';
import {
  Add24Regular, Delete20Regular, ArrowDownload20Regular, Document24Regular,
  Copy20Regular, Warning16Filled, MoreVertical20Regular, Search20Regular,
} from '@fluentui/react-icons';
import {
  listTemplates, deleteTemplate, duplicateTemplate, downloadBlob,
} from '../api/client';
import type { TemplateEntry } from '../api/client';
import { timeAgo } from '../lib/format';
import { TemplateDrawer } from './TemplateDrawer';
import { fontDisplay } from '../theme';

const useStyles = makeStyles({
  root: { maxWidth: '960px', margin: '0 auto', padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}` },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalL,
  },
  titleRow: { display: 'flex', alignItems: 'baseline', gap: tokens.spacingHorizontalS },
  title: { fontFamily: fontDisplay, letterSpacing: '-0.02em' },
  count: {
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  tableCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center',
    marginBottom: tokens.spacingVerticalM, flexWrap: 'wrap',
  },
  search: { flex: 1, minWidth: '200px' },
  dropdown: { minWidth: '160px' },
  empty: {
    textAlign: 'center', padding: `calc(${tokens.spacingVerticalXXL} * 1.5) ${tokens.spacingHorizontalXXL}`,
    color: tokens.colorNeutralForeground3,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
  },
  row: { cursor: 'pointer' },
  nameCell: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  tags: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, marginTop: tokens.spacingVerticalXXS },
  fields: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  fieldBadge: { fontFamily: tokens.fontFamilyMonospace },
  warn: { color: tokens.colorStatusWarningForeground1, display: 'inline-flex', alignItems: 'center' },
  muted: { color: tokens.colorNeutralForeground3 },
  actionsCell: { display: 'flex', gap: tokens.spacingHorizontalXXS, justifyContent: 'flex-end' },
  noResults: {
    padding: tokens.spacingVerticalXXL, textAlign: 'center', color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
  },
});

interface Props { onNew: () => void; }

const sortOptions = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'fields-desc', label: 'Most fields' },
  { value: 'fields-asc', label: 'Fewest fields' },
];

export function TemplateList({ onNew }: Props) {
  const s = useStyles();

  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TemplateEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateEntry | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('updated');

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    templates.forEach(t => {
      if (t.tags) {
        t.tags.forEach(tag => {
          if (tag.trim()) set.add(tag.trim());
        });
      }
    });
    return Array.from(set).sort();
  }, [templates]);

  useEffect(() => {
    if (selectedTag && !uniqueTags.includes(selectedTag)) {
      setSelectedTag(null);
    }
  }, [uniqueTags, selectedTag]);

  const notify = (message: string, intent: 'success' | 'error' | 'info' = 'info') => {
    if (intent === 'success') toast.success(message);
    else if (intent === 'error') toast.error(message);
    else toast(message);
  };

  const load = async () => {
    setLoading(true);
    try {
      setTemplates(await listTemplates());
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reflect a single mutated entry into local state without a full reload.
  const upsert = (entry: TemplateEntry) => {
    setTemplates(prev => {
      const next = prev.some(t => t.id === entry.id)
        ? prev.map(t => (t.id === entry.id ? entry : t))
        : [...prev, entry];
      return next;
    });
    setSelected(prev => (prev && prev.id === entry.id ? entry : prev));
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = templates.filter(t => {
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        t.fields.some(f => f.toLowerCase().includes(q)) ||
        (t.tags ?? []).some(tag => tag.toLowerCase().includes(q))
      );
    });

    if (selectedTag) {
      list = list.filter(t => (t.tags ?? []).includes(selectedTag));
    }

    const recency = (t: TemplateEntry) => new Date(t.updatedAt ?? t.createdAt).getTime();

    return [...list].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'fields-desc') {
        return b.fields.length - a.fields.length;
      }
      if (sortBy === 'fields-asc') {
        return a.fields.length - b.fields.length;
      }
      return recency(b) - recency(a);
    });
  }, [templates, search, selectedTag, sortBy]);

  const handleDownload = async (t: TemplateEntry) => {
    try {
      const r = await fetch(`/api/templates/${t.id}/download`);
      if (!r.ok) throw new Error(`Download failed: ${r.status}`);
      downloadBlob(await r.blob(), `${t.id}.docx`);
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const handleDuplicate = async (t: TemplateEntry) => {
    setBusyId(t.id);
    try {
      const copy = await duplicateTemplate(t.id);
      upsert(copy);
      notify(`Duplicated as “${copy.name}”`, 'success');
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setBusyId(id);
    try {
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSelected(prev => (prev?.id === id ? null : prev));
      notify('Template deleted', 'success');
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={s.root}>

      <div className={s.header}>
        <div className={s.titleRow}>
          <Text size={800} weight="semibold" className={s.title}>Templates</Text>
          {!loading && templates.length > 0 && (
            <Text size={300} className={s.count}>{templates.length}</Text>
          )}
        </div>
        <Button appearance="primary" icon={<Add24Regular />} onClick={onNew}>
          New Template
        </Button>
      </div>

      {!loading && templates.length > 0 && (
        <div className={s.toolbar}>
          <Input
            className={s.search}
            contentBefore={<Search20Regular />}
            placeholder="Search name, field or tag…"
            value={search}
            onChange={(_, d) => setSearch(d.value)}
          />
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton className={s.dropdown}>
                {selectedTag ? `Tag: ${selectedTag}` : 'All tags'}
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setSelectedTag(null)}>All tags</MenuItem>
                {uniqueTags.map(tag => (
                  <MenuItem key={tag} onClick={() => setSelectedTag(tag)}>
                    {tag}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton className={s.dropdown}>
                Sort: {sortOptions.find(o => o.value === sortBy)?.label || 'Last updated'}
              </MenuButton>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {sortOptions.map(opt => (
                  <MenuItem key={opt.value} onClick={() => setSortBy(opt.value)}>
                    {opt.label}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading templates…" />
      ) : templates.length === 0 ? (
        <div className={s.empty}>
          <Document24Regular fontSize={48} />
          <Text size={400}>No templates yet</Text>
          <Button appearance="primary" icon={<Add24Regular />} onClick={onNew}>
            Create your first template
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className={s.noResults}>
          <Text>No templates match the search or filter criteria.</Text>
        </div>
      ) : (
        <div className={s.tableCard}>
          <Table aria-label="Templates">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Fields</TableHeaderCell>
                <TableHeaderCell>Updated</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(t => (
                <TableRow key={t.id} className={s.row} onClick={() => setSelected(t)}>
                  <TableCell>
                    <div className={s.nameCell}>
                      <Text weight="semibold">{t.name}</Text>
                      {t.fields.length === 0 && (
                        <Tooltip content="No fields detected — won’t fill anything" relationship="label">
                          <span className={s.warn}><Warning16Filled /></span>
                        </Tooltip>
                      )}
                    </div>
                    {(t.tags ?? []).length > 0 && (
                      <div className={s.tags}>
                        {t.tags!.map(tag => (
                          <Badge key={tag} appearance="tint" color="brand" size="small">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={s.fields}>
                      {t.fields.length === 0
                        ? <Text size={200} className={s.muted}>none</Text>
                        : t.fields.slice(0, 4).map(f => (
                          <Badge key={f} appearance="outline" color="informative" size="small" className={s.fieldBadge}>{f}</Badge>
                        ))
                      }
                      {t.fields.length > 4 && (
                        <Badge appearance="outline" size="small">+{t.fields.length - 4}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Text size={200} className={s.muted}>{timeAgo(t.updatedAt ?? t.createdAt)}</Text></TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className={s.actionsCell}>
                      <Tooltip content="Download" relationship="label">
                        <Button size="small" appearance="subtle" icon={<ArrowDownload20Regular />} onClick={() => handleDownload(t)} />
                      </Tooltip>
                      <Menu>
                        <MenuTrigger disableButtonEnhancement>
                          <MenuButton size="small" appearance="subtle" icon={<MoreVertical20Regular />} aria-label="More actions" />
                        </MenuTrigger>
                        <MenuPopover>
                          <MenuList>
                            <MenuItem icon={<Copy20Regular />} disabled={busyId === t.id} onClick={() => handleDuplicate(t)}>Duplicate</MenuItem>
                            <MenuItem icon={<Delete20Regular />} onClick={() => setDeleteTarget(t)}>Delete</MenuItem>
                          </MenuList>
                        </MenuPopover>
                      </Menu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TemplateDrawer
        template={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onUpdated={upsert}
        onDuplicated={upsert}
        onRequestDelete={(t) => setDeleteTarget(t)}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(_, d) => !d.open && setDeleteTarget(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogContent>
              “{deleteTarget?.name}” will be permanently removed. This can’t be undone.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button appearance="primary" onClick={confirmDelete}>Delete</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
