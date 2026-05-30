import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TemplateEntry } from '@open-doc/shared';
import type { IStorageAdapter } from './storage.interface';

@Injectable()
export class FilesystemAdapter implements IStorageAdapter {
  private readonly dir: string;

  constructor(private readonly config: ConfigService) {
    this.dir = this.config.get<string>('TEMPLATE_DIR', './templates');
  }

  private metaPath(id: string) {
    return path.join(this.dir, `${id}.meta.json`);
  }

  private docxPath(id: string) {
    return path.join(this.dir, `${id}.docx`);
  }

  async list(): Promise<TemplateEntry[]> {
    await fs.mkdir(this.dir, { recursive: true });
    const files = await fs.readdir(this.dir);
    const ids = [...new Set(files.filter(f => f.endsWith('.meta.json')).map(f => f.replace('.meta.json', '')))];
    const entries = await Promise.all(ids.map(id => this.getMeta(id)));
    return entries.filter(Boolean) as TemplateEntry[];
  }

  async get(id: string): Promise<Buffer> {
    const p = this.docxPath(id);
    try {
      return Buffer.from(await fs.readFile(p));
    } catch {
      throw new NotFoundException(`Template ${id} not found`);
    }
  }

  async save(id: string, buffer: Buffer, name: string): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.docxPath(id), buffer);
    const stat = await fs.stat(this.docxPath(id));
    const now = new Date().toISOString();
    const meta: TemplateEntry = {
      id,
      name,
      size: stat.size,
      createdAt: now,
      updatedAt: now,
      fields: [],
    };
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta));
  }

  /** Overwrite the docx of an existing template, preserving its metadata. */
  async replaceFile(id: string, buffer: Buffer): Promise<void> {
    const meta = await this.getMeta(id);
    if (!meta) throw new NotFoundException(`Template ${id} not found`);
    await fs.writeFile(this.docxPath(id), buffer);
    const stat = await fs.stat(this.docxPath(id));
    meta.size = stat.size;
    meta.updatedAt = new Date().toISOString();
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta));
  }

  /** Merge editable metadata fields (name/description/tags) into an entry. */
  async updateMeta(
    id: string,
    patch: { name?: string; description?: string; tags?: string[] },
  ): Promise<void> {
    const meta = await this.getMeta(id);
    if (!meta) throw new NotFoundException(`Template ${id} not found`);
    if (patch.name !== undefined) meta.name = patch.name;
    if (patch.description !== undefined) meta.description = patch.description;
    if (patch.tags !== undefined) meta.tags = patch.tags;
    meta.updatedAt = new Date().toISOString();
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta));
  }

  async delete(id: string): Promise<void> {
    if (!(await this.exists(id))) throw new NotFoundException(`Template ${id} not found`);
    await Promise.all([
      fs.unlink(this.docxPath(id)).catch(() => {}),
      fs.unlink(this.metaPath(id)).catch(() => {}),
    ]);
  }

  async exists(id: string): Promise<boolean> {
    try {
      await fs.access(this.docxPath(id));
      return true;
    } catch {
      return false;
    }
  }

  async updateFields(id: string, fields: string[]): Promise<void> {
    const meta = await this.getMeta(id);
    if (!meta) throw new NotFoundException(`Template ${id} not found`);
    meta.fields = fields;
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta));
  }

  private async getMeta(id: string): Promise<TemplateEntry | null> {
    try {
      const raw = await fs.readFile(this.metaPath(id), 'utf-8');
      return JSON.parse(raw) as TemplateEntry;
    } catch {
      return null;
    }
  }
}
