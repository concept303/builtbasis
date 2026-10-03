import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../src/web/core/i18n';
import { Measurements } from '../../src/web/record/Measurements';
import type { SharedRecord } from '../../src/domain';
import { measurementNumber } from '../../src/web/record/number-format';
import { Sharing } from '../../src/web/record/Sharing';

it('permits the owner to create a link for a Draft record', () => {
  const html = renderToStaticMarkup(createElement(LanguageProvider, { children: createElement(Sharing, { base: '/api/projects/1/records/1', draft: true, onAccessLost() {}, onDirty() {} }) }));
  expect(html).toContain('Create link');
  expect(html).not.toContain('<fieldset disabled');
});

describe('measurement numeric display', () => {
  for (const lang of ['en', 'el'] as const) {
    it(`round trips finite doubles, including subnormal values and exponents, in ${lang}`, () => {
      for (const value of [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, 1e-12, -1e-12, 1e21, 1.000000001, 1.000000001 - 1, 0.12345678901234568]) {
        const text = measurementNumber(value, lang);
        expect(Number(text.replace(',', '.'))).toBe(value === 0 ? 0 : value);
        if (lang === 'el') expect(text).not.toContain('.');
      }
      expect(measurementNumber(0.12345678901234568, lang)).toBe(lang === 'el' ? '0,12345678901234568' : '0.12345678901234568');
    });
    it(`preserves small nonzero differences and precise values in ${lang}`, () => {
      const sets: SharedRecord['measurements'] = [{ id: 1, date: '2026-01-01', phase: 'before', measuredById: null, note: null, rows: [
        { item: 'First', quantity: 'Width', unit: 'mm', value: 1, note: null },
        { item: 'Second', quantity: 'Width', unit: 'mm', value: 1.000000001, note: null },
        { item: 'Small', quantity: 'Depth', unit: 'mm', value: 1e-12, note: null },
      ] }];
      const html = renderToStaticMarkup(createElement(LanguageProvider, { shared: lang === 'el', children: createElement(Measurements, { sets, people: [], owner: false, onEdit() {}, onDelete() {} }) }));
      expect(html).toContain(lang === 'el' ? '1,000000001' : '1.000000001');
      expect(html).toContain(lang === 'el' ? '1,000000082740371e-9' : '1.000000082740371e-9');
      expect(html).toContain('1e-12');
    });
  }
});
