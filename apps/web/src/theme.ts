import { createLightTheme } from '@fluentui/react-components';
import type { BrandVariants, Theme } from '@fluentui/react-components';

/**
 * open-doc brand ramp — a document-green that distances the UI from the stock
 * Fluent blue while staying calm and professional. Monotonic light→ from 160→10.
 */
const brand: BrandVariants = {
    10: '#001107',
    20: '#00220F',
    30: '#003117',
    40: '#05401F',
    50: '#0B5028',
    60: '#136032',
    70: '#1B713C',
    80: '#258246',
    90: '#379353',
    100: '#4FA266',
    110: '#6AB17C',
    120: '#88C094',
    130: '#A7CFAE',
    140: '#C6DEC9',
    150: '#E2EDE3',
    160: '#F2F8F3',
};

/** Distinctive type pairing, applied through Fluent's base/mono tokens. */
export const fontDisplay = "'Fraunces Variable', 'Iowan Old Style', Georgia, serif";

export const openDocTheme: Theme = {
    ...createLightTheme(brand),
    fontFamilyBase: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
    fontFamilyMonospace: "'IBM Plex Mono', ui-monospace, 'Cascadia Code', monospace",
};
