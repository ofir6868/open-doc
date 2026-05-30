import type { TemplateEntry } from '@open-doc/shared';

export type TemplateMetaPatch = Partial<
  Pick<TemplateEntry, 'name' | 'description' | 'tags'>
>;

export interface IStorageAdapter {
  list(): Promise<TemplateEntry[]>;
  get(id: string): Promise<Buffer>;
  save(id: string, buffer: Buffer, name: string): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
