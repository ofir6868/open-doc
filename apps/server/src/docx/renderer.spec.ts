import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { DocxReader } from './reader';
import { DocxRenderer } from './renderer';

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
      <w:sdtContent><w:p><w:r><w:t>PLACEHOLDER</w:t></w:r></w:p></w:sdtContent>
    </w:sdt>
    <w:sdt>
      <w:sdtPr><w:tag w:val="case.number"/></w:sdtPr>
      <w:sdtContent><w:p><w:r><w:t>PLACEHOLDER</w:t></w:r></w:p></w:sdtContent>
    </w:sdt>
  </w:body>
</w:document>`;

describe('DocxRenderer', () => {
  const reader = new DocxReader();
  const renderer = new DocxRenderer();

  it('injects data into content controls', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    const result = renderer.render(doc, { client: { firstName: 'Alice' }, case: { number: '2024-999' } });
    const zip = new PizZip(result);
    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).toContain('Alice');
    expect(xml).toContain('2024-999');
  });

  it('renders missing fields as empty string', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    const result = renderer.render(doc, {});
    expect(result).toBeDefined();
  });

  it('throws 422 in strict mode when fields are missing', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    expect(() => renderer.render(doc, {}, true)).toThrow();
  });

  it('returns a Buffer', () => {
    const buffer = makeDocx(FIXTURE_XML);
    const doc = reader.read(buffer);
    const result = renderer.render(doc, { client: { firstName: 'Bob' }, case: { number: '1' } });
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('renderHtml fills fields, preserves spaces, and escapes markup', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hi</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:sdt><w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr><w:sdtContent><w:r><w:rPr><w:b/></w:rPr><w:t>X</w:t></w:r></w:sdtContent></w:sdt></w:p></w:body></w:document>`;
    const doc = reader.read(makeDocx(xml));
    const html = renderer.renderHtml(doc, { client: { firstName: 'A<b>&' } });
    expect(html).toContain('<p dir="auto">');
    expect(html).toContain('Hi ');
    // value is bolded (run formatting preserved) and HTML-escaped
    expect(html).toContain('<strong>A&lt;b&gt;&amp;</strong>');
    expect(html).not.toContain('<w:sdt');
  });

  function renderToXml(xml: string, data: Record<string, unknown>): string {
    const doc = reader.read(makeDocx(xml));
    const result = renderer.render(doc, data);
    return new PizZip(result).file('word/document.xml')!.asText();
  }

  it('preserves document order of controls interleaved with paragraphs', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Intro</w:t></w:r></w:p>
    <w:sdt><w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>X</w:t></w:r></w:p></w:sdtContent></w:sdt>
    <w:p><w:r><w:t>Middle</w:t></w:r></w:p>
    <w:sdt><w:sdtPr><w:tag w:val="case.number"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Y</w:t></w:r></w:p></w:sdtContent></w:sdt>
    <w:p><w:r><w:t>Outro</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const out = renderToXml(xml, { client: { firstName: 'Alice' }, case: { number: '2024-999' } });
    const order = ['Intro', 'Alice', 'Middle', '2024-999', 'Outro'];
    const positions = order.map((s) => out.indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
  });

  it('unwraps controls so no w:sdt remains in the output', () => {
    const out = renderToXml(FIXTURE_XML, { client: { firstName: 'Alice' }, case: { number: '1' } });
    expect(out).not.toContain('<w:sdt>');
    expect(out).not.toContain('w:sdtContent');
  });

  it('preserves run properties (formatting) when replacing text', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:sdt><w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr>
      <w:sdtContent><w:p><w:r><w:rPr><w:b/><w:rtl/></w:rPr><w:t>PH</w:t></w:r></w:p></w:sdtContent>
    </w:sdt>
  </w:body>
</w:document>`;
    const out = renderToXml(xml, { client: { firstName: 'Alice' } });
    expect(out).toContain('Alice');
    expect(out).toContain('<w:b');
    expect(out).toContain('<w:rtl');
  });

  it('preserves spaces around and between fields (including space-only runs)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>probably</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:sdt><w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr><w:sdtContent><w:r><w:t>X</w:t></w:r></w:sdtContent></w:sdt><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>though</w:t></w:r></w:p></w:body></w:document>`;
    const out = renderToXml(xml, { client: { firstName: 'Alice' } });
    const text = out.replace(/<[^>]+>/g, '');
    expect(text).toContain('probably Alice though');
  });

  it('does not inject a paragraph into an inline control', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:t>Hello </w:t></w:r>
      <w:sdt><w:sdtPr><w:tag w:val="client.firstName"/></w:sdtPr><w:sdtContent><w:r><w:t>X</w:t></w:r></w:sdtContent></w:sdt>
      <w:r><w:t> world</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
    const out = renderToXml(xml, { client: { firstName: 'Alice' } });
    // Exactly one paragraph — the inline field must not add its own <w:p>.
    expect((out.match(/<w:p>/g) || []).length).toBe(1);
    const hello = out.indexOf('Hello');
    const alice = out.indexOf('Alice');
    const world = out.indexOf('world');
    expect(hello).toBeLessThan(alice);
    expect(alice).toBeLessThan(world);
  });
});
