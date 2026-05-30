export interface ContentControl {
  tag: string;
  node: Record<string, unknown>;
}

export interface DocxDocument {
  zip: import('pizzip');
  xmlStr: string;
  contentControls: ContentControl[];
}
