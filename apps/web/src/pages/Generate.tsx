import React, { useEffect, useState } from 'react';
import {
  Button, Text, Spinner, makeStyles, tokens, Textarea, Label,
} from '@fluentui/react-components';
import { ArrowLeft24Regular, ArrowDownload24Regular, DocumentText24Regular } from '@fluentui/react-icons';
import { listTemplates, generateDocument, previewDocument, downloadBlob } from '../api/client';
import type { TemplateEntry } from '../api/client';
import { DocPreviewPane } from './DocPreviewPane';

const useStyles = makeStyles({
  root: { maxWidth: '640px', margin: '0 auto', padding: tokens.spacingHorizontalXXL },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalXL },
  card: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalL,
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM,
  },
  hint: { color: tokens.colorNeutralForeground3, fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'flex-end' },
  error: { color: tokens.colorPaletteRedForeground1 },
  previewCard: {
    marginTop: tokens.spacingVerticalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  previewBody: {
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
    backgroundColor: tokens.colorNeutralBackground1,
    maxHeight: '420px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.6',
    fontFamily: `Calibri, ${tokens.fontFamilyBase}`,
  },
});

function buildSampleData(fields: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const path of fields) {
    const parts = path.split('.');
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]]) cur[parts[i]] = {};
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = `<${path}>`;
  }
  return obj;
}

interface Props { templateId: string; onBack: () => void; }

export function Generate({ templateId, onBack }: Props) {
  const s = useStyles();
  const [template, setTemplate] = useState<TemplateEntry | null>(null);
  const [json, setJson] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates().then(list => {
      const t = list.find(x => x.id === templateId);
      if (t) {
        setTemplate(t);
        setJson(JSON.stringify(buildSampleData(t.fields), null, 2));
      }
    });
  }, [templateId]);

  const parseData = (): Record<string, unknown> | null => {
    try {
      return JSON.parse(json);
    } catch {
      setJsonError('Invalid JSON');
      return null;
    }
  };

  const handlePreview = async () => {
    setError(null);
    setJsonError(null);
    const data = parseData();
    if (!data) return;
    setPreviewing(true);
    try {
      const html = await previewDocument(templateId, data);
      setPreview(html);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPreviewing(false);
    }
  };

  const handleDownload = async () => {
    setError(null);
    setJsonError(null);
    const data = parseData();
    if (!data) return;
    setDownloading(true);
    try {
      const blob = await generateDocument(templateId, data);
      downloadBlob(blob, `${templateId}-generated.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <Button icon={<ArrowLeft24Regular />} appearance="subtle" onClick={onBack} />
        <div>
          <Text size={600} weight="semibold">Generate Document</Text>
          {template && <Text size={300} style={{ display: 'block', color: tokens.colorNeutralForeground3 }}>{template.name}</Text>}
        </div>
      </div>

      <div className={s.card}>
        <div>
          <Label htmlFor="json-data" weight="semibold">Data (JSON)</Label>
          <Text size={200} style={{ display: 'block', marginBottom: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground3 }}>
            Fill in the values — placeholders show the field paths
          </Text>
          <Textarea
            id="json-data"
            value={json}
            onChange={(_, d) => { setJson(d.value); setPreview(null); }}
            rows={16}
            style={{ fontFamily: tokens.fontFamilyMonospace, width: '100%' }}
          />
          {jsonError && <Text className={s.error}>{jsonError}</Text>}
        </div>

        {error && <Text className={s.error}>{error}</Text>}

        <div className={s.actions}>
          <Button
            appearance="secondary"
            icon={previewing ? <Spinner size="tiny" /> : <DocumentText24Regular />}
            disabled={previewing}
            onClick={handlePreview}
          >
            Preview
          </Button>
          <Button
            appearance="primary"
            icon={downloading ? <Spinner size="tiny" /> : <ArrowDownload24Regular />}
            disabled={downloading || !preview}
            onClick={handleDownload}
            title={!preview ? 'Preview the document first' : undefined}
          >
            Confirm & Download
          </Button>
        </div>
      </div>

      {(preview !== null || previewing) && (
        <div className={s.previewCard} style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className={s.previewHeader}>
            <DocumentText24Regular />
            <Text weight="semibold">Preview</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              — review the filled document, then confirm
            </Text>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <DocPreviewPane html={preview} loading={previewing} error={error ?? undefined} />
          </div>
        </div>
      )}

    </div>
  );
}
