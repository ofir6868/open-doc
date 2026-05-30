import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { get } from 'lodash';
import type { DocxDocument } from './docx.types';
import {
  PARSER_OPTIONS,
  BUILDER_OPTIONS,
  type OoxmlNode,
  elementName,
  children,
  findChild,
  getSdtTag,
  getText,
  collectTextElements,
  attr,
} from './ooxml-util';

export const FIELD_SENTINEL = '\x00FIELD\x00';

@Injectable()
export class DocxRenderer {
  render(doc: DocxDocument, data: Record<string, unknown>, strict?: boolean): Buffer {
    const ast = this.fill(doc.xmlStr, data, strict);
    const builder = new XMLBuilder(BUILDER_OPTIONS);
    const newXml = builder.build(ast);
    doc.zip.file('word/document.xml', newXml);
    return Buffer.from(doc.zip.generate({ type: 'nodebuffer' }));
  }

  /**
   * Renders the filled document to high-fidelity, complete HTML for in-browser preview.
   * Leverages detailed parsing of paragraphs, headings, alignment, lists, tables,
   * inline styles (bold, italic, underline, sizing, colors), and hyperlinks.
   * If a value begins with FIELD_SENTINEL, it is styled as an interactive chip tag.
   */
  renderHtml(doc: DocxDocument, data: Record<string, unknown>): string {
    const ast = this.fill(doc.xmlStr, data, false);
    const body = this.findBody(ast);
    const blocks: string[] = [];
    if (body) {
      this.collectBlocks(children(body), blocks);
    }
    return this.wrapDocument(blocks.join('\n'));
  }

  /** Parse, inject values into tagged controls, optionally enforce strict mode. */
  private fill(xmlStr: string, data: Record<string, unknown>, strict?: boolean): OoxmlNode[] {
    const parser = new XMLParser(PARSER_OPTIONS);
    const ast = parser.parse(xmlStr) as OoxmlNode[];

    const missing: string[] = [];
    this.fillSdts(ast, data, missing);

    if (strict && missing.length > 0) {
      throw new UnprocessableEntityException({
        error: 'Missing fields',
        missing,
      });
    }

    return ast;
  }

  /**
   * Walks the element array in place. For each tagged content control we set
   * the field value into its existing runs (preserving formatting and the
   * inline/block structure), then unwrap the control — splicing its content
   * into the parent at the same position so document order and layout are kept.
   */
  private fillSdts(arr: OoxmlNode[], data: Record<string, unknown>, missing: string[]): void {
    for (let i = 0; i < arr.length; i++) {
      const el = arr[i];
      const name = elementName(el);
      if (!name) continue;

      if (name === 'w:sdt') {
        const contentEl = findChild(children(el), 'w:sdtContent');
        const contentKids = contentEl ? children(contentEl) : [];
        const tag = getSdtTag(el);

        if (tag) {
          const value = get(data, tag);
          if (value === undefined || value === null) {
            missing.push(tag);
          }
          this.setRunsText(contentKids, String(value ?? ''));
          // Unwrap: replace the control with its (now-filled) content.
          arr.splice(i, 1, ...contentKids);
          // Re-visit the spliced-in content (handles nested controls).
          i--;
          continue;
        }

        // Untagged control: keep the wrapper, descend into its content.
        this.fillSdts(contentKids, data, missing);
        continue;
      }

      const kids = children(el, name);
      if (kids.length) this.fillSdts(kids, data, missing);
    }
  }

  /**
   * Puts `value` into the first text run and blanks the rest, keeping every
   * run's properties (font, size, bold, RTL direction) intact.
   */
  private setRunsText(contentKids: OoxmlNode[], value: string): void {
    const texts = collectTextElements(contentKids);
    if (texts.length === 0) return;

    texts.forEach((t, idx) => {
      t['w:t'] = [{ '#text': idx === 0 ? value : '' }];
      t[':@'] = { ...(t[':@'] ?? {}), '@_xml:space': 'preserve' };
    });
  }

  // ---- HTML high-fidelity preview generator ----

  private findBody(ast: OoxmlNode[]): OoxmlNode | undefined {
    const doc = findChild(ast, 'w:document');
    if (!doc) return undefined;
    return findChild(children(doc), 'w:body');
  }

  /** Emit paragraphs, tables and descend structural blocks */
  private collectBlocks(arr: OoxmlNode[], out: string[]): void {
    for (const el of arr) {
      const name = elementName(el);
      if (!name) continue;
      if (name === 'w:p') {
        out.push(this.renderParagraph(el));
      } else if (name === 'w:tbl') {
        out.push(this.renderTable(el));
      } else {
        this.collectBlocks(children(el, name), out);
      }
    }
  }

  private renderParagraph(pEl: OoxmlNode): string {
    const pPr = findChild(children(pEl), 'w:pPr');
    const pPrKids = pPr ? children(pPr) : [];

    // Heading level support (Heading1 -> <h1>, etc)
    const pStyleEl = findChild(pPrKids, 'w:pStyle');
    const styleVal = pStyleEl ? attr(pStyleEl, 'w:val') : '';
    let tagName = 'p';
    let extraClass = '';
    if (styleVal && styleVal.toLowerCase().startsWith('heading')) {
      const level = parseInt(styleVal.replace(/\D/g, ''), 10);
      if (level >= 1 && level <= 6) {
        tagName = `h${level}`;
      }
    }

    // Alignment justification support
    const jcEl = findChild(pPrKids, 'w:jc');
    const jcVal = jcEl ? attr(jcEl, 'w:val') : '';
    let alignmentStyle = '';
    if (jcVal === 'center') alignmentStyle = 'text-align: center;';
    else if (jcVal === 'right') alignmentStyle = 'text-align: right;';
    else if (jcVal === 'both') alignmentStyle = 'text-align: justify;';

    // Indentation support
    const indEl = findChild(pPrKids, 'w:ind');
    let indentStyle = '';
    if (indEl) {
      const leftVal = attr(indEl, 'w:left') || attr(indEl, 'w:left-chars');
      const leftTwips = leftVal ? parseInt(leftVal, 10) : 0;
      if (leftTwips > 0) {
        // 720 twips = 0.5 inches = 8.3% page width
        const leftEm = (leftTwips / 720).toFixed(2);
        indentStyle = `padding-left: ${leftEm}em;`;
      }
    }

    // List properties (bullets/numbers)
    const numPrEl = findChild(pPrKids, 'w:numPr');
    let listPrefix = '';
    if (numPrEl) {
      // Simplification: treat all lists as standard bullets for document structure layout
      listPrefix = '<span class="bullet">•</span>';
      extraClass = 'list-paragraph';
    }

    const inlineContent: string[] = [];
    this.walkInline(children(pEl), inlineContent);
    const content = inlineContent.join('');

    const styles = [alignmentStyle, indentStyle].filter(Boolean).join(' ');
    const styleAttr = styles ? ` style="${styles}"` : '';
    const classAttr = extraClass ? ` class="${extraClass}"` : '';

    return `<${tagName} dir="auto"${classAttr}${styleAttr}>${listPrefix}${content || '&nbsp;'}</${tagName}>`;
  }

  private walkInline(arr: OoxmlNode[], out: string[]): void {
    for (const el of arr) {
      const name = elementName(el);
      if (!name || name === 'w:pPr') continue;
      if (name === 'w:r') {
        out.push(this.renderRun(el));
      } else if (name === 'w:hyperlink') {
        const relationshipId = attr(el, 'r:id') || '';
        // Wrap children in a hyperlink decoration block
        const hyperContent: string[] = [];
        this.walkInline(children(el, name), hyperContent);
        out.push(`<span class="hyperlink">${hyperContent.join('')}</span>`);
      } else {
        this.walkInline(children(el, name), out);
      }
    }
  }

  private renderRun(rEl: OoxmlNode): string {
    const kids = children(rEl);
    const rPr = findChild(kids, 'w:rPr');
    const flags = rPr ? children(rPr) : [];
    const on = (n: string): boolean =>
      flags.some((f) => {
        if (elementName(f) !== n) return false;
        const v = f[':@']?.['@_w:val'];
        return v !== '0' && v !== 'false';
      });

    // Font Sizing and Colors
    const szEl = findChild(flags, 'w:sz');
    const sizeVal = szEl ? attr(szEl, 'w:val') : '';
    let sizeStyle = '';
    if (sizeVal) {
      const sizePt = parseInt(sizeVal, 10) / 2;
      sizeStyle = `font-size: ${sizePt}pt;`;
    }

    const colorEl = findChild(flags, 'w:color');
    const colorVal = colorEl ? attr(colorEl, 'w:val') : '';
    let colorStyle = '';
    if (colorVal && colorVal !== 'auto') {
      colorStyle = `color: #${colorVal};`;
    }

    const highlightEl = findChild(flags, 'w:highlight');
    const highlightVal = highlightEl ? attr(highlightEl, 'w:val') : '';
    let highlightStyle = '';
    if (highlightVal && highlightVal !== 'none') {
      highlightStyle = `background-color: ${highlightVal};`;
    }

    let text = '';
    for (const el of kids) {
      const name = elementName(el);
      if (name === 'w:t') text += this.escape(getText(el));
      else if (name === 'w:tab') text += '&nbsp;&nbsp;&nbsp;&nbsp;';
      else if (name === 'w:br' || name === 'w:cr') text += '<br/>';
    }

    if (!text) return '';

    // If it's a template field chip sentinel, unwrap it directly
    if (text.startsWith(FIELD_SENTINEL)) {
      const fieldTag = text.substring(FIELD_SENTINEL.length);
      return `<span class="field-chip">{{${fieldTag}}}</span>`;
    }

    // Apply inline text properties
    let styleCombined = [sizeStyle, colorStyle, highlightStyle].filter(Boolean).join(' ');
    if (styleCombined) {
      text = `<span style="${styleCombined}">${text}</span>`;
    }

    if (on('w:b')) text = `<strong>${text}</strong>`;
    if (on('w:i')) text = `<em>${text}</em>`;
    if (on('w:u')) text = `<u>${text}</u>`;
    return text;
  }

  private renderTable(tblEl: OoxmlNode): string {
    const rowsHtml: string[] = [];
    const kids = children(tblEl);
    for (const el of kids) {
      const name = elementName(el);
      if (name === 'w:tr') {
        rowsHtml.push(this.renderTableRow(el));
      }
    }
    return `<table><tbody>${rowsHtml.join('\n')}</tbody></table>`;
  }

  private renderTableRow(trEl: OoxmlNode): string {
    const cellsHtml: string[] = [];
    const kids = children(trEl);
    for (const el of kids) {
      const name = elementName(el);
      if (name === 'w:tc') {
        cellsHtml.push(this.renderTableCell(el));
      }
    }
    return `<tr>${cellsHtml.join('')}</tr>`;
  }

  private renderTableCell(tcEl: OoxmlNode): string {
    const tcPr = findChild(children(tcEl), 'w:tcPr');
    const tcPrKids = tcPr ? children(tcPr) : [];

    // Table Colspan Support
    const gridSpanEl = findChild(tcPrKids, 'w:gridSpan');
    const colspan = gridSpanEl ? attr(gridSpanEl, 'w:val') : '';
    const colspanAttr = colspan ? ` colspan="${colspan}"` : '';

    // Cell Shading / Background support
    const shdEl = findChild(tcPrKids, 'w:shd');
    const fillVal = shdEl ? attr(shdEl, 'w:fill') : '';
    let shadingStyle = '';
    if (fillVal && fillVal !== 'auto') {
      shadingStyle = `background-color: #${fillVal};`;
    }

    const cellBlocks: string[] = [];
    this.collectBlocks(children(tcEl), cellBlocks);
    const content = cellBlocks.join('\n') || '&nbsp;';

    const styleAttr = shadingStyle ? ` style="${shadingStyle}"` : '';

    return `<td${colspanAttr}${styleAttr}>${content}</td>`;
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Wrap elements inside a perfect self-contained HTML page styling document.
   * Simulates page layout, margins, typography, lists, borders, and field chips.
   */
  private wrapDocument(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    background-color: #f3f3f3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 30px 10px;
    display: flex;
    justify-content: center;
  }
  .page {
    background-color: #ffffff;
    box-sizing: border-box;
    width: 100%;
    max-width: 800px;
    min-height: 1000px;
    padding: 60px 80px;
    border: 1px solid #dcdcdc;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    color: #333333;
    font-size: 11pt;
    line-height: 1.5;
  }
  p {
    margin: 0 0 10px 0;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 15px 0 10px 0;
    color: #111111;
    font-weight: 600;
  }
  h1 { font-size: 22pt; border-bottom: 1px solid #eeeeee; padding-bottom: 5px; }
  h2 { font-size: 18pt; }
  h3 { font-size: 14pt; }
  h4 { font-size: 12pt; }
  
  .list-paragraph {
    display: flex;
    align-items: flex-start;
    margin-bottom: 6px;
  }
  .bullet {
    margin-right: 8px;
    color: #666666;
    flex-shrink: 0;
    user-select: none;
  }
  
  .hyperlink {
    color: #0078d4;
    text-decoration: underline;
    cursor: pointer;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 15px 0;
  }
  td, th {
    border: 1px solid #cccccc;
    padding: 8px 12px;
    min-height: 24px;
    font-size: 10pt;
    vertical-align: top;
  }
  
  .field-chip {
    background-color: #e8f0fe;
    color: #1a73e8;
    border: 1px solid #b3c8f7;
    border-radius: 99px;
    padding: 2px 8px;
    margin: 0 3px;
    font-family: "SF Mono", "Fira Code", Consolas, Monaco, monospace;
    font-size: 9pt;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
    box-shadow: 0 1px 2px rgba(26,115,232,0.08);
    user-select: none;
  }
</style>
</head>
<body>
  <div class="page">
    ${bodyHtml}
  </div>
</body>
</html>`;
  }
}
