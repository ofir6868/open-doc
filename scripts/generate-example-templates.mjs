// Generates the example .docx templates shipped in examples/templates.
//
// Each document already contains tagged Word content controls (w:sdt with a
// w:tag), so they work with the generation engine immediately — no add-in
// mapping needed. Field tags match config/schema.json. Run with:
//
//   node scripts/generate-example-templates.mjs
//
import PizZip from 'pizzip';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'examples', 'templates');

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** A plain text run. `opts`: { bold, italic, size (half-points), color } */
function run(text, opts = {}) {
  const rpr = runProps(opts);
  return `<w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function runProps({ bold, italic, size, color } = {}) {
  const parts = [];
  if (bold) parts.push('<w:b/>');
  if (italic) parts.push('<w:i/>');
  if (color) parts.push(`<w:color w:val="${color}"/>`);
  if (size) parts.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
  return parts.length ? `<w:rPr>${parts.join('')}</w:rPr>` : '';
}

/** A tagged content control rendered inline. The filled value inherits the bold run style. */
function field(tag, alias) {
  return (
    `<w:sdt><w:sdtPr>` +
    `<w:alias w:val="${esc(alias)}"/><w:tag w:val="${esc(tag)}"/>` +
    `<w:rPr><w:b/></w:rPr>` +
    `</w:sdtPr><w:sdtContent>` +
    `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">{{${tag}}}</w:t></w:r>` +
    `</w:sdtContent></w:sdt>`
  );
}

/** A paragraph. `opts`: { align, spacingAfter, runs } where runs is the inner XML. */
function para(runsXml, { align, spacingAfter = 160 } = {}) {
  const ppr =
    `<w:pPr>` +
    (align ? `<w:jc w:val="${align}"/>` : '') +
    `<w:spacing w:after="${spacingAfter}"/>` +
    `</w:pPr>`;
  return `<w:p>${ppr}${runsXml}</w:p>`;
}

function heading(text) {
  return para(run(text, { bold: true, size: 32 }), { align: 'center', spacingAfter: 320 });
}

function buildDocx(bodyParagraphs) {
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W}"><w:body>` +
    bodyParagraphs.join('') +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>` +
    `</w:body></w:document>`;

  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr>` +
    `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>` +
    `<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
    `</w:styles>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`;

  const docRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('word/document.xml', documentXml);
  zip.file('word/_rels/document.xml.rels', docRels);
  zip.file('word/styles.xml', stylesXml);
  return zip.generate({ type: 'nodebuffer' });
}

// ---- Templates ----

const templates = {
  'nda-template.docx': [
    heading('MUTUAL NON-DISCLOSURE AGREEMENT'),
    para(
      run('This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of ') +
        field('agreement.date', 'Agreement date') +
        run(' by and between ') +
        field('party.disclosing', 'Disclosing party') +
        run(' ("Disclosing Party") and ') +
        field('party.receiving', 'Receiving party') +
        run(' ("Receiving Party").'),
    ),
    para(
      run('1. Confidential Information. ', { bold: true }) +
        run('Each party may disclose certain confidential and proprietary information to the other party for the purpose of evaluating a potential business relationship.'),
    ),
    para(
      run('2. Term. ', { bold: true }) +
        run('The obligations of confidentiality under this Agreement shall remain in effect for a period of ') +
        field('agreement.term', 'Term') +
        run(' from the date first written above.'),
    ),
    para(
      run('3. Governing Law. ', { bold: true }) +
        run('This Agreement shall be governed by and construed in accordance with the laws of ') +
        field('agreement.jurisdiction', 'Jurisdiction') +
        run('.'),
    ),
    para(run('IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.'), { spacingAfter: 480 }),
    para(run('Disclosing Party: ') + field('party.disclosing', 'Disclosing party')),
    para(run('Receiving Party: ') + field('party.receiving', 'Receiving party')),
  ],

  'employment-letter-template.docx': [
    para(field('letter.date', 'Letter date'), { align: 'right' }),
    para(run('Dear ') + field('employee.name', 'Employee name') + run(',')),
    heading('OFFER OF EMPLOYMENT'),
    para(
      run('On behalf of ') +
        field('company.name', 'Company name') +
        run(', I am pleased to offer you the position of ') +
        field('employee.title', 'Job title') +
        run('. We were impressed with your background and believe you will be a valuable addition to our team.'),
    ),
    para(
      run('Your employment will begin on ') +
        field('employee.startDate', 'Start date') +
        run('. Your starting annual compensation will be ') +
        field('employee.salary', 'Salary') +
        run(', payable in accordance with the company’s standard payroll schedule.'),
    ),
    para(run('We look forward to welcoming you to ') + field('company.name', 'Company name') + run('.'), { spacingAfter: 480 }),
    para(run('Sincerely,')),
    para(field('company.signatory', 'Signatory'), { spacingAfter: 0 }),
    para(field('company.signatoryTitle', 'Signatory title')),
  ],

  'invoice-template.docx': [
    heading('INVOICE'),
    para(run('Invoice #: ', { bold: true }) + field('invoice.number', 'Invoice number'), { spacingAfter: 0 }),
    para(run('Date: ', { bold: true }) + field('invoice.date', 'Invoice date'), { spacingAfter: 0 }),
    para(run('Due date: ', { bold: true }) + field('invoice.dueDate', 'Due date'), { spacingAfter: 320 }),
    para(run('Bill to:', { bold: true }), { spacingAfter: 0 }),
    para(field('client.name', 'Client name'), { spacingAfter: 0 }),
    para(field('client.address', 'Client address'), { spacingAfter: 320 }),
    para(
      run('Description: ', { bold: true }) +
        field('item.description', 'Line item description') +
        run('   Amount: ', { bold: true }) +
        field('item.amount', 'Line item amount'),
    ),
    para(run('Total due: ', { bold: true, size: 26 }) + field('invoice.total', 'Total'), { align: 'right' }),
    para(run('Thank you for your business.', { italic: true }), { align: 'center' }),
  ],
};

mkdirSync(OUT_DIR, { recursive: true });

let total = 0;
for (const [name, body] of Object.entries(templates)) {
  const buffer = buildDocx(body);
  const outPath = join(OUT_DIR, name);
  writeFileSync(outPath, buffer);

  // Sanity check: re-open and count tagged controls.
  const zip = new PizZip(buffer);
  const xml = zip.file('word/document.xml').asText();
  const tags = [...xml.matchAll(/w:tag w:val="([^"]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(tags)];
  total += 1;
  console.log(`✓ ${name}  (${buffer.length} bytes, ${unique.length} fields: ${unique.join(', ')})`);
}
console.log(`\nGenerated ${total} templates in examples/templates/`);
