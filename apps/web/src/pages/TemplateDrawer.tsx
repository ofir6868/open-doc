import React, { useEffect, useRef, useState } from 'react';
import {
  OverlayDrawer, DrawerHeader, DrawerHeaderTitle, DrawerBody,
  Button, Input, Textarea, Label, Text, Badge, Spinner, Divider,
  Tag, TagGroup, Tooltip, makeStyles, tokens,
} from '@fluentui/react-components';
import {
  Dismiss24Regular, ArrowDownload20Regular, Copy20Regular,
  Delete20Regular, ArrowSync20Regular, Save20Regular, AddRegular,
} from '@fluentui/react-icons';
import {
  updateTemplate, replaceTemplate, duplicateTemplate, downloadBlob,
} from '../api/client';
import type { TemplateEntry } from '../api/client';
import { formatBytes, formatDate, timeAgo, diffFields } from '../lib/format';
import { toast } from 'sonner';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  section: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  sectionLabel: { color: tokens.colorNeutralForeground3 },
  tagRow: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  fields: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
  fieldBadge: { fontFamily: tokens.fontFamilyMonospace },
  meta: {
    display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: tokens.spacingVerticalXXS,
    columnGap: tokens.spacingHorizontalM, fontSize: tokens.fontSizeBase200,
  },
  metaKey: { color: tokens.colorNeutralForeground3 },
  metaVal: { color: tokens.colorNeutralForeground2 },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  grow: { flex: 1 },
  diff: {
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS,
    padding: tokens.spacingHorizontalM, borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  added: { color: tokens.colorPaletteGreenForeground1, fontFamily: tokens.fontFamilyMonospace },
  removed: { color: tokens.colorPaletteRedForeground1, fontFamily: tokens.fontFamilyMonospace },
  danger: { color: tokens.colorPaletteRedForeground1 },
});

interface Props {
  template: TemplateEntry | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (t: TemplateEntry) => void;
  onDuplicated: (t: TemplateEntry) => void;
  onRequestDelete: (t: TemplateEntry) => void;
}

export function TemplateDrawer({
  template, open, onClose, onUpdated, onDuplicated, onRequestDelete,
}: Props) {
  const s = useStyles();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [diff, setDiff] = useState<{ added: string[]; removed: string[] } | null>(null);

  // Re-sync the editable form whenever a different template is opened.
  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setDescription(template.description ?? '');
    setTags(template.tags ?? []);
    setTagDraft('');
    setDiff(null);
  }, [template?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!template) return null;

  const dirty =
    name !== template.name ||
    description !== (template.description ?? '') ||
    JSON.stringify(tags) !== JSON.stringify(template.tags ?? []);

  const addTag = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTemplate(template.id, { name: name.trim() || template.name, description, tags });
      onUpdated(updated);
      toast.success('Changes saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceFile = async (file: File) => {
    setReplacing(true);
    setDiff(null);
    const before = template.fields;
    try {
      const updated = await replaceTemplate(template.id, file);
      const d = diffFields(before, updated.fields);
      setDiff(d);
      onUpdated(updated);
      const summary = d.added.length || d.removed.length
        ? `Document replaced — +${d.added.length} / −${d.removed.length} fields`
        : 'Document replaced — fields unchanged';
      toast.success(summary);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setReplacing(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await duplicateTemplate(template.id);
      onDuplicated(copy);
      toast.success(`Duplicated as "${copy.name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDuplicating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const r = await fetch(`/api/templates/${template.id}/download`);
      if (!r.ok) throw new Error(`Download failed: ${r.status}`);
      downloadBlob(await r.blob(), `${template.id}.docx`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <OverlayDrawer position="end" open={open} onOpenChange={(_, d) => !d.open && onClose()} size="medium">
      <DrawerHeader>
        <DrawerHeaderTitle
          action={
            <Button appearance="subtle" icon={<Dismiss24Regular />} aria-label="Close" onClick={onClose} />
          }
        >
          Template details
        </DrawerHeaderTitle>
      </DrawerHeader>

      <DrawerBody>
        <div className={s.body}>
          <div className={s.section}>
            <Label htmlFor="d-name" size="small" weight="semibold">Name</Label>
            <Input id="d-name" value={name} onChange={(_, d) => setName(d.value)} />
          </div>

          <div className={s.section}>
            <Label htmlFor="d-desc" size="small" weight="semibold">Description</Label>
            <Textarea
              id="d-desc"
              value={description}
              placeholder="What is this template for? (e.g. EU contracts only)"
              onChange={(_, d) => setDescription(d.value)}
              rows={2}
            />
          </div>

          <div className={s.section}>
            <Label htmlFor="d-tag" size="small" weight="semibold">Tags</Label>
            {tags.length > 0 && (
              <TagGroup onDismiss={(_, d) => setTags(tags.filter(t => t !== d.value))}>
                {tags.map(t => (
                  <Tag key={t} value={t} dismissible size="small">{t}</Tag>
                ))}
              </TagGroup>
            )}
            <div className={s.tagRow}>
              <Input
                id="d-tag"
                className={s.grow}
                size="small"
                value={tagDraft}
                placeholder="Add a tag, press Enter"
                onChange={(_, d) => setTagDraft(d.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagDraft); } }}
              />
              <Button size="small" icon={<AddRegular />} disabled={!tagDraft.trim()} onClick={() => addTag(tagDraft)} />
            </div>
          </div>

          <Button
            appearance="primary"
            icon={saving ? <Spinner size="tiny" /> : <Save20Regular />}
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            Save changes
          </Button>

          <Divider />

          <div className={s.section}>
            <Text size={200} weight="semibold" className={s.sectionLabel}>
              {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
            </Text>
            {template.fields.length === 0 ? (
              <Text size={200} className={s.danger}>
                No fields detected — this template won’t fill anything when generating.
              </Text>
            ) : (
              <div className={s.fields}>
                {template.fields.map(f => (
                  <Badge key={f} appearance="outline" color="informative" size="small" className={s.fieldBadge}>
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {diff && (
            <div className={s.diff}>
              <Text size={200} weight="semibold">Field changes from this replace</Text>
              {diff.added.length === 0 && diff.removed.length === 0 && (
                <Text size={200} className={s.sectionLabel}>No field changes.</Text>
              )}
              {diff.added.map(f => <Text key={`+${f}`} size={200} className={s.added}>+ {f}</Text>)}
              {diff.removed.map(f => <Text key={`-${f}`} size={200} className={s.removed}>− {f}</Text>)}
            </div>
          )}

          <Divider />

          <div className={s.meta}>
            <span className={s.metaKey}>ID</span><span className={`${s.metaVal} ${s.mono}`}>{template.id}</span>
            <span className={s.metaKey}>Size</span><span className={s.metaVal}>{formatBytes(template.size)}</span>
            <span className={s.metaKey}>Created</span><span className={s.metaVal}>{formatDate(template.createdAt)}</span>
            {template.updatedAt && (
              <>
                <span className={s.metaKey}>Updated</span>
                <span className={s.metaVal}>{timeAgo(template.updatedAt)}</span>
              </>
            )}
          </div>

          <Divider />

          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleReplaceFile(f); e.target.value = ''; }}
          />
          <div className={s.actions}>
            <Tooltip content="Upload a corrected .docx in place, keeping this template’s identity" relationship="label">
              <Button
                icon={replacing ? <Spinner size="tiny" /> : <ArrowSync20Regular />}
                disabled={replacing}
                onClick={() => fileRef.current?.click()}
              >
                Replace document
              </Button>
            </Tooltip>
            <Button icon={<ArrowDownload20Regular />} onClick={handleDownload}>Download</Button>
            <Button
              icon={duplicating ? <Spinner size="tiny" /> : <Copy20Regular />}
              disabled={duplicating}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
            <Button
              appearance="subtle"
              className={s.danger}
              icon={<Delete20Regular />}
              onClick={() => onRequestDelete(template)}
            >
              Delete
            </Button>
          </div>
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
