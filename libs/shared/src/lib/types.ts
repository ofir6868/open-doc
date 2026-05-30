export type FieldType = 'string' | 'number' | 'date' | 'boolean';
export type SchemaNode = FieldType | { [key: string]: SchemaNode };
export type SchemaDefinition = { [entity: string]: SchemaNode };

export interface TemplateEntry {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  /** Last time the document or its metadata was changed. Falls back to createdAt for legacy entries. */
  updatedAt?: string;
  /** Freeform note shown in the detail drawer (e.g. usage guidance). */
  description?: string;
  /** Labels for organising a large template library. */
  tags?: string[];
  fields: string[];
}

export interface GenerateRequest {
  templateId: string;
  data: Record<string, unknown>;
  strict?: boolean;
}

export interface GenerateError {
  error: string;
  missing?: string[];
}
