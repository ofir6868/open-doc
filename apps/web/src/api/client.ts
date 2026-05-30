const BASE = '/api';

export interface TemplateEntry {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  tags?: string[];
  fields: string[];
}

export interface TemplatePatch {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface PreviewResult {
  name: string;
  fields: string[];
}

export async function listTemplates(): Promise<TemplateEntry[]> {
  const r = await fetch(`${BASE}/templates`);
  if (!r.ok) throw new Error(`Failed to list templates: ${r.status}`);
  return r.json();
}

export async function deleteTemplate(id: string): Promise<void> {
  const r = await fetch(`${BASE}/templates/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`Failed to delete: ${r.status}`);
}

export async function updateTemplate(id: string, patch: TemplatePatch): Promise<TemplateEntry> {
  const r = await fetch(`${BASE}/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Failed to update: ${r.status}`);
  return r.json();
}

export async function replaceTemplate(id: string, file: File): Promise<TemplateEntry> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/templates/${id}/file`, { method: 'PUT', body: form });
  if (!r.ok) throw new Error(`Replace failed: ${r.status}`);
  return r.json();
}

export async function duplicateTemplate(id: string): Promise<TemplateEntry> {
  const r = await fetch(`${BASE}/templates/${id}/duplicate`, { method: 'POST' });
  if (!r.ok) throw new Error(`Duplicate failed: ${r.status}`);
  return r.json();
}

export async function prepareTemplate(file: File): Promise<Blob> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/templates/prepare`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`Prepare failed: ${r.status}`);
  return r.blob();
}

export async function previewTemplate(file: File): Promise<PreviewResult> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/templates/preview`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`Preview failed: ${r.status}`);
  return r.json();
}

export async function previewTemplateHtml(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(`${BASE}/templates/preview-html`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`Preview HTML failed: ${r.status}`);
  const { html } = await r.json();
  return html;
}


export async function uploadTemplate(file: File, name: string): Promise<TemplateEntry> {
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  const r = await fetch(`${BASE}/templates`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json();
}

export async function generateDocument(templateId: string, data: Record<string, unknown>): Promise<Blob> {
  const r = await fetch(`${BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, data }),
  });
  if (!r.ok) throw new Error(`Generate failed: ${r.status}`);
  return r.blob();
}

export async function previewDocument(templateId: string, data: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${BASE}/generate/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, data }),
  });
  if (!r.ok) throw new Error(`Preview failed: ${r.status}`);
  const { html } = await r.json();
  return html;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
