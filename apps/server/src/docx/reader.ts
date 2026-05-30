import { Injectable } from '@nestjs/common';
import PizZip from 'pizzip';
import { XMLParser } from 'fast-xml-parser';
import type { ContentControl, DocxDocument } from './docx.types';
import {
  PARSER_OPTIONS,
  type OoxmlNode,
  elementName,
  children,
  getSdtTag,
} from './ooxml-util';

@Injectable()
export class DocxReader {
  read(buffer: Buffer): DocxDocument {
    const zip = new PizZip(buffer);
    const xmlStr = zip.file('word/document.xml')!.asText();
    const parser = new XMLParser(PARSER_OPTIONS);
    const ast = parser.parse(xmlStr) as OoxmlNode[];
    const contentControls = this.extractContentControls(ast);
    return { zip, xmlStr, contentControls };
  }

  private extractContentControls(ast: OoxmlNode[]): ContentControl[] {
    const seen = new Set<string>();
    const results: ContentControl[] = [];

    const walk = (arr: OoxmlNode[]): void => {
      for (const el of arr) {
        const name = elementName(el);
        if (!name) continue;
        if (name === 'w:sdt') {
          const tag = getSdtTag(el);
          if (tag && !seen.has(tag)) {
            seen.add(tag);
            results.push({ tag, node: el });
          }
        }
        const kids = children(el, name);
        if (kids.length) walk(kids);
      }
    };

    walk(ast);
    return results;
  }
}
