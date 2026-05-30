// Helpers for working with a fast-xml-parser AST produced with `preserveOrder: true`.
//
// In that mode every element is an object with exactly one tag key whose value
// is an array of child elements, plus an optional ':@' key holding attributes.
// Text nodes are `{ '#text': 'value' }`. Keeping the array form is what lets us
// preserve sibling document order across a parse -> build round-trip.

export type OoxmlNode = Record<string, any>;

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: false,
  allowBooleanAttributes: true,
  preserveOrder: true,
  // Word fragments text into many runs, including whitespace-only runs like
  // `<w:t> </w:t>`. Trimming (the default) would drop those and fuse adjacent
  // words together, so we must keep text values verbatim.
  trimValues: false,
  // Keep text exactly as written — never coerce to numbers (which would mangle
  // values like leading-zero IDs "007" or phone numbers).
  parseTagValue: false,
} as const;

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true,
  format: false,
  suppressEmptyNode: false,
} as const;

export { PARSER_OPTIONS, BUILDER_OPTIONS };

/** The tag name of an element (the single key that isn't attributes or text). */
export function elementName(el: OoxmlNode): string | undefined {
  return Object.keys(el).find((k) => k !== ':@' && k !== '#text');
}

/** Child elements of `el`. Defaults to the element's own tag when `name` is omitted. */
export function children(el: OoxmlNode, name?: string): OoxmlNode[] {
  const key = name ?? elementName(el);
  const val = key ? el[key] : undefined;
  return Array.isArray(val) ? val : [];
}

/** Read an attribute value (without the `@_` prefix). */
export function attr(el: OoxmlNode, name: string): string | undefined {
  return el[':@']?.[`@_${name}`];
}

/** First direct child element matching `name`. */
export function findChild(arr: OoxmlNode[], name: string): OoxmlNode | undefined {
  return arr.find((c) => elementName(c) === name);
}

/** Resolve the `w:tag` value of a `w:sdt` content control, or null. */
export function getSdtTag(sdtEl: OoxmlNode): string | null {
  const pr = findChild(children(sdtEl), 'w:sdtPr');
  if (!pr) return null;
  const tagEl = findChild(children(pr), 'w:tag');
  if (!tagEl) return null;
  return attr(tagEl, 'w:val') ?? null;
}

/** Concatenated `#text` content directly inside an element (e.g. a `w:t`). */
export function getText(el: OoxmlNode): string {
  const name = elementName(el);
  const kids = name ? el[name] : undefined;
  if (!Array.isArray(kids)) return '';
  return kids
    .map((k) => ('#text' in k ? String(k['#text']) : ''))
    .join('');
}

/** All `w:t` text-run elements anywhere under the given element list. */
export function collectTextElements(arr: OoxmlNode[], out: OoxmlNode[] = []): OoxmlNode[] {
  for (const el of arr) {
    const name = elementName(el);
    if (!name) continue;
    if (name === 'w:t') out.push(el);
    const kids = children(el, name);
    if (kids.length) collectTextElements(kids, out);
  }
  return out;
}
