import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Input, Label, Spinner, Text, Badge,
  makeStyles, tokens, Divider,
} from '@fluentui/react-components';
import {
  ArrowLeft24Regular, ArrowDownload24Regular,
  ArrowUpload24Regular, Checkmark24Regular, Document24Regular,
  Checkmark12Filled,
} from '@fluentui/react-icons';
import { prepareTemplate, previewTemplate, previewTemplateHtml, uploadTemplate, downloadBlob } from '../api/client';
import type { TemplateEntry, PreviewResult } from '../api/client';
import { fontDisplay } from '../theme';
import { DocPreviewPane } from './DocPreviewPane';


const useStyles = makeStyles({
  root: { maxWidth: '640px', margin: '0 auto', padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}` },
  rootWide: { maxWidth: '1180px', margin: '0 auto', padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}` },
  title: { fontFamily: fontDisplay, letterSpacing: '-0.02em' },
  confirmLayout: {
    display: 'flex', gap: tokens.spacingHorizontalXL, alignItems: 'flex-start',
  },
  previewPane: {
    flex: '1 1 0', minWidth: 0,
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS,
  },
  previewLabel: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
  },
  previewSurface: {
    height: '74vh',
    display: 'flex',
    flexDirection: 'column',
  },
  confirmPane: { flex: '0 0 360px', maxWidth: '360px' },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  header: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalXL },
  stepper: {
    display: 'flex', alignItems: 'center', marginBottom: tokens.spacingVerticalXL,
  },
  stepItem: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalSNudge },
  circle: {
    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold,
    border: `1.5px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
    transition: 'all 0.2s ease',
  },
  circleActive: {
    border: `1.5px solid ${tokens.colorBrandStroke1}`,
    color: tokens.colorBrandForeground1,
    boxShadow: `0 0 0 3px ${tokens.colorBrandBackground2}`,
  },
  circleDone: {
    border: 'none',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  stepText: { color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  stepTextActive: { color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold },
  connector: {
    flex: 1, height: '2px', margin: `0 ${tokens.spacingHorizontalS}`,
    borderRadius: '1px', backgroundColor: tokens.colorNeutralStroke2,
    transition: 'background-color 0.2s ease',
  },
  connectorOn: { backgroundColor: tokens.colorBrandBackground },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
    padding: tokens.spacingHorizontalXL,
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM,
  },
  dropzone: {
    border: `2px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacingVerticalS,
    ':hover': { border: `2px dashed ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2 },
  },
  dropzoneActive: { border: `2px dashed ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2 },
  fieldList: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  instructions: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalM,
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS,
  },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'flex-end' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

function Dropzone({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  const s = useStyles();
  const [dragging, setDragging] = useState(false);
  const ref = React.useRef<HTMLInputElement>(null);

  const handle = (f: File | null | undefined) => { if (f && f.name.endsWith('.docx')) onFile(f); };

  return (
    <div
      className={`${s.dropzone} ${dragging ? s.dropzoneActive : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
    >
      <ArrowUpload24Regular />
      <Text size={300}>{label}</Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>.docx files only</Text>
      <input ref={ref} type="file" accept=".docx" style={{ display: 'none' }}
        onChange={e => handle(e.target.files?.[0])} />
    </div>
  );
}

function DocxPreview({ file }: { file: File }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    previewTemplateHtml(file)
      .then(h => {
        if (cancelled) return;
        setHtml(h);
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [file]);

  return (
    <DocPreviewPane html={html} loading={loading} error={error ?? undefined} />
  );
}


function Stepper({ current, steps }: { current: number; steps: string[] }) {
  const s = useStyles();
  return (
    <div className={s.stepper}>
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={`${s.connector} ${n <= current ? s.connectorOn : ''}`} />}
            <div className={s.stepItem}>
              <div className={`${s.circle} ${done ? s.circleDone : active ? s.circleActive : ''}`}>
                {done ? <Checkmark12Filled /> : n}
              </div>
              <Text size={200} className={`${s.stepText} ${active ? s.stepTextActive : ''}`}>{label}</Text>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface Props { onDone: (entry: TemplateEntry) => void; onBack: () => void; }

export function UploadWizard({ onDone, onBack }: Props) {
  const s = useStyles();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // 'guided' walks through prepare → map → confirm; 'direct' skips prepare for
  // power users who already have a content-control-mapped .docx in hand.
  const [mode, setMode] = useState<'guided' | 'direct'>('guided');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preparedName, setPreparedName] = useState('');

  // Step 2 state
  const [mappedFile, setMappedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  // Step 3 state
  const [templateName, setTemplateName] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  // Step 1 → prepare and download
  const handlePrepare = () => run(async () => {
    if (!originalFile) return;
    const blob = await prepareTemplate(originalFile);
    const base = originalFile.name.replace(/\.docx$/i, '').replace(/-template$/, '');
    const name = `${base}-template.docx`;
    setPreparedName(name);
    downloadBlob(blob, name);
    setStep(2);
  });

  // Step 2 → preview fields
  const handlePreview = () => run(async () => {
    if (!mappedFile) return;
    const result = await previewTemplate(mappedFile);
    setPreview(result);
    setTemplateName(result.name);
    setStep(3);
  });

  // Step 3 → confirm upload
  const handleConfirm = () => run(async () => {
    if (!mappedFile || !preview) return;
    const entry = await uploadTemplate(mappedFile, templateName || preview.name);
    onDone(entry);
  });

  return (
    <div className={step === 3 ? s.rootWide : s.root}>
      <div className={s.header}>
        <Button icon={<ArrowLeft24Regular />} appearance="subtle" onClick={onBack} />
        <Text size={700} weight="semibold" className={s.title}>New Template</Text>
      </div>

      <Stepper current={step} steps={['Prepare', 'Map Fields', 'Confirm']} />

      {step === 1 && (
        <div className={s.card}>
          <Text size={400} weight="semibold">Upload your original document</Text>
          <Text size={300}>We'll prepare a copy with a template suffix ready for field mapping.</Text>
          <Dropzone
            label={originalFile ? originalFile.name : 'Drop your .docx here or click to browse'}
            onFile={setOriginalFile}
          />
          {error && <Text className={s.error}>{error}</Text>}
          <div className={s.actions}>
            <Button
              appearance="subtle"
              onClick={() => { setMode('direct'); setError(null); setStep(2); }}
            >
              I already have a mapped template
            </Button>
            <Button
              appearance="primary"
              icon={loading ? <Spinner size="tiny" /> : <ArrowDownload24Regular />}
              disabled={!originalFile || loading}
              onClick={handlePrepare}
            >
              Prepare & Download
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={s.card}>
          <Text size={400} weight="semibold">
            {mode === 'direct' ? 'Upload your mapped template' : 'Map fields, then re-upload'}
          </Text>
          {mode === 'guided' ? (
            <div className={s.instructions}>
              <Text size={300} weight="semibold">Steps:</Text>
              <Text size={200}>1. Open the downloaded <strong>{preparedName}</strong> in Word</Text>
              <Text size={200}>2. Use the <strong>open-doc add-in</strong> to insert content controls at each field position</Text>
              <Text size={200}>3. Save the file (Ctrl+S)</Text>
              <Text size={200}>4. Upload the saved file below</Text>
            </div>
          ) : (
            <Text size={300}>
              Upload a <strong>.docx</strong> that already has content controls inserted with the open-doc add-in.
            </Text>
          )}
          <Dropzone
            label={mappedFile ? mappedFile.name : 'Drop the mapped .docx here or click to browse'}
            onFile={setMappedFile}
          />
          {error && <Text className={s.error}>{error}</Text>}
          <div className={s.actions}>
            <Button appearance="subtle" onClick={() => setStep(1)}>Back</Button>
            <Button
              appearance="primary"
              disabled={!mappedFile || loading}
              icon={loading ? <Spinner size="tiny" /> : undefined}
              onClick={handlePreview}
            >
              Detect Fields
            </Button>
          </div>
        </div>
      )}

      {step === 3 && preview && mappedFile && (
        <div className={s.confirmLayout}>
          <div className={s.previewPane}>
            <div className={s.previewLabel}>
              <Document24Regular />
              <Text size={300} weight="semibold">Document preview</Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                — review the document as it will be stored
              </Text>
            </div>
            <div className={s.previewSurface}>
              <DocxPreview file={mappedFile} />
            </div>
          </div>

          <div className={`${s.card} ${s.confirmPane}`}>
            <Text size={400} weight="semibold">Confirm template</Text>

            <div className={s.inputGroup}>
              <Label htmlFor="tpl-name" size="small" weight="semibold">Template name</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(_, d) => setTemplateName(d.value)}
              />
            </div>

            <Divider />

            <Text size={300} weight="semibold">
              {preview.fields.length} field{preview.fields.length !== 1 ? 's' : ''} detected
            </Text>

            {preview.fields.length === 0 ? (
              <Text className={s.error}>
                No content controls found — go back and make sure you inserted fields with the add-in.
              </Text>
            ) : (
              <div className={s.fieldList}>
                {preview.fields.map(f => (
                  <Badge key={f} appearance="outline" color="informative">{f}</Badge>
                ))}
              </div>
            )}

            {error && <Text className={s.error}>{error}</Text>}

            <div className={s.actions}>
              <Button appearance="subtle" onClick={() => setStep(2)}>Back</Button>
              <Button
                appearance="primary"
                icon={loading ? <Spinner size="tiny" /> : <Checkmark24Regular />}
                disabled={preview.fields.length === 0 || loading}
                onClick={handleConfirm}
              >
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
