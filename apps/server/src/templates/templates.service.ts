import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import type { TemplateEntry } from '@open-doc/shared';
import { STORAGE_ADAPTER, type IStorageAdapter } from '../storage/storage.interface';
import { FilesystemAdapter } from '../storage/filesystem.storage';
import { DocxReader } from '../docx/reader';

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(STORAGE_ADAPTER) private readonly storage: IStorageAdapter,
    private readonly filesystemAdapter: FilesystemAdapter,
    private readonly reader: DocxReader,
  ) {}

  async list(): Promise<TemplateEntry[]> {
    return this.storage.list();
  }

  async get(id: string): Promise<TemplateEntry> {
    const entries = await this.storage.list();
    const entry = entries.find(e => e.id === id);
    if (!entry) throw new NotFoundException(`Template ${id} not found`);
    return entry;
  }

  async getRaw(id: string): Promise<Buffer> {
    return this.storage.get(id);
  }

  async upload(id: string, buffer: Buffer, name: string): Promise<TemplateEntry> {
    await this.storage.save(id, buffer, name);
    const doc = this.reader.read(buffer);
    const fields = doc.contentControls.map(cc => cc.tag);
    await this.filesystemAdapter.updateFields(id, fields);
    return this.get(id);
  }

  async updateMeta(
    id: string,
    patch: { name?: string; description?: string; tags?: string[] },
  ): Promise<TemplateEntry> {
    await this.get(id); // 404 if missing
    await this.filesystemAdapter.updateMeta(id, patch);
    return this.get(id);
  }

  /** Replace the docx of an existing template in place, re-extracting fields. */
  async replace(id: string, buffer: Buffer): Promise<TemplateEntry> {
    await this.get(id); // 404 if missing
    await this.filesystemAdapter.replaceFile(id, buffer);
    const doc = this.reader.read(buffer);
    const fields = doc.contentControls.map(cc => cc.tag);
    await this.filesystemAdapter.updateFields(id, fields);
    return this.get(id);
  }

  /** Copy a template (docx + editable metadata) under a fresh id. */
  async duplicate(id: string): Promise<TemplateEntry> {
    const source = await this.get(id);
    const buffer = await this.storage.get(id);
    const newId = await this.uniqueId(`${id}-copy`);
    await this.storage.save(newId, buffer, `${source.name} (copy)`);
    const doc = this.reader.read(buffer);
    await this.filesystemAdapter.updateFields(newId, doc.contentControls.map(cc => cc.tag));
    await this.filesystemAdapter.updateMeta(newId, {
      description: source.description,
      tags: source.tags,
    });
    return this.get(newId);
  }

  private async uniqueId(base: string): Promise<string> {
    if (!(await this.storage.exists(base))) return base;
    for (let i = 2; ; i++) {
      const candidate = `${base}-${i}`;
      if (!(await this.storage.exists(candidate))) return candidate;
    }
  }

  async delete(id: string): Promise<void> {
    return this.storage.delete(id);
  }

  async download(id: string): Promise<Buffer> {
    return this.storage.get(id);
  }

  prepare(buffer: Buffer, originalName: string): { buffer: Buffer; filename: string } {
    const base = path.basename(originalName, '.docx').replace(/-template$/, '');
    return { buffer, filename: `${base}-template.docx` };
  }

  preview(buffer: Buffer, originalName: string): { name: string; fields: string[] } {
    const doc = this.reader.read(buffer);
    const fields = doc.contentControls.map(cc => cc.tag);
    const name = path.basename(originalName, '.docx').replace(/-template$/, '');
    return { name, fields };
  }
}
