import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { DocxReader } from './reader';

function makeDocx(xml: string): Buffer {
  const zip = new PizZip();
  zip.file('word/document.xml', xml);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>`);
  return Buffer.from(zip.generate({ type: 'nodebuffer' }));
}

const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:sdt>
      <w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr>
      <w:sdtContent><w:p><w:r><w:t>John</w:t></w:r></w:p></w:sdtContent>
    </w:sdt>
    <w:sdt>
      <w:sdtPr><w:tag w:val="case.number"/></w:sdtPr>
      <w:sdtContent><w:p><w:r><w:t>2024-001</w:t></w:r></w:p></w:sdtContent>
    </w:sdt>
  </w:body>
</w:document>`;

describe('DocxReader', () => {
  const reader = new DocxReader();

  it('extracts content control tags', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    expect(doc.contentControls.map(c => c.tag)).toEqual(['client.firstName', 'case.number']);
  });

  it('returns the zip and xmlStr', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    expect(doc.zip).toBeDefined();
    expect(doc.xmlStr).toContain('client.firstName');
  });

  it('returns empty array when no content controls', () => {
    const xml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>`;
    const buffer = makeDocx(xml);
    const doc = reader.read(buffer);
    expect(doc.contentControls).toHaveLength(0);
  });
});
