import type { SchemaDefinition, SchemaNode, FieldType } from './types';

export function getLeafPaths(schema: SchemaDefinition, prefix = ''): string[] {
  const paths: string[] = [];
  for (const [key, value] of Object.entries(schema)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      paths.push(fullKey);
    } else {
      paths.push(...getLeafPaths(value as SchemaDefinition, fullKey));
    }
  }
  return paths;
}

export function isLeaf(node: SchemaNode): node is FieldType {
  return typeof node === 'string';
}
