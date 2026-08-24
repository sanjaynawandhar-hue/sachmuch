import { describe, expect, it } from 'vitest';
import { palette } from '../src/tokens/color';
import { clayShadow, clayNative } from '../src/tokens/clay';
import { contrastRatio, WCAG_AA_NORMAL, WCAG_AA_LARGE } from '../src/tokens/contrast';
import { categoryTint } from '../src/tokens/tint';
import { typeStyle } from '../src/tokens/type';

const SCHEMES = ['light', 'dark'] as const;

describe('contrast — claymorphism is low contrast by nature, so this is a gate not a nicety', () => {
  for (const scheme of SCHEMES) {
    const p = palette[scheme];
    it(`${scheme}: body ink on every clay ground clears AA normal`, () => {
      for (const ground of [p.bg, p.surface, p.sunken]) {
        expect(contrastRatio(p.ink, ground)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }
    });

    it(`${scheme}: soft ink clears AA normal on surface`, () => {
      expect(contrastRatio(p.inkSoft, p.surface)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    });

    it(`${scheme}: ink on an accent fill clears AA normal`, () => {
      for (const accent of [p.flame, p.rose, p.violet, p.indigo, p.jade, p.haldi]) {
        expect(contrastRatio(p.onAccent, accent)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
      }
    });
  }

  it('every one of the 29 category tints keeps ink readable on its own ground', () => {
    for (const scheme of SCHEMES) {
      for (let i = 0; i < 29; i++) {
        const t = categoryTint(i, 29, scheme);
        expect(contrastRatio(palette[scheme].ink, t.bg), `cat ${i} ${scheme} bg`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        expect(contrastRatio(palette[scheme].ink, t.surface), `cat ${i} ${scheme} surface`).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
        // accent is used for chip text and small labels — large-text threshold
        expect(contrastRatio(t.accent, t.bg), `cat ${i} ${scheme} accent`).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
        expect(contrastRatio(t.accentTo, t.bg), `cat ${i} ${scheme} accentTo`).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
      }
    }
  });
});

describe('clay recipe', () => {
  it('raised light matches the four-layer reference recipe at level 2', () => {
    expect(clayShadow({ scheme: 'light', level: 2, state: 'raised' })).toBe(
      'inset 6px 6px 12px rgba(255,255,255,0.92), ' +
        'inset -6px -6px 14px rgba(103,90,140,0.18), ' +
        '14px 14px 28px rgba(84,70,120,0.16), ' +
        '-8px -8px 22px rgba(255,255,255,0.80)',
    );
  });

  it('pressed is two insets and no outer cast', () => {
    const s = clayShadow({ scheme: 'light', state: 'pressed' });
    expect(s).toBe(
      'inset 8px 8px 16px rgba(103,90,140,0.26), inset -6px -6px 14px rgba(255,255,255,0.72)',
    );
  });

  it('dark uses the low-alpha highlight and the longer cast, not an inversion', () => {
    const s = clayShadow({ scheme: 'dark', level: 2 });
    expect(s).toContain('rgba(255,255,255,0.070)');
    expect(s).toContain('16.1px 16.1px 32.2px rgba(0,0,0,0.62)');
  });

  it('native emits the same geometry as the web', () => {
    const native = clayNative({ scheme: 'light', level: 2 });
    expect(native.boxShadow).toHaveLength(4);
    expect(native.boxShadow[0]).toEqual({
      offsetX: 6, offsetY: 6, blurRadius: 12, color: 'rgba(255,255,255,0.92)', inset: true,
    });
    expect(native.backgroundColor).toBe(palette.light.surface);
  });
});

describe('type', () => {
  it('Devanagari gets more leading than Latin at the same size', () => {
    const en = typeStyle('body', 'latin');
    const hi = typeStyle('body', 'devanagari');
    expect(hi.fontSize).toBe(en.fontSize);
    expect(hi.lineHeight / en.lineHeight).toBeGreaterThanOrEqual(1.2);
  });

  it('display and hooks use one family across both scripts', () => {
    expect(typeStyle('hook', 'latin').fontFamily).toBe(typeStyle('hook', 'devanagari').fontFamily);
  });
});

/**
 * The Phase 0 gate, as an assertion rather than a screenshot: web and native
 * must render the same clay, because they come from the same function over the
 * same numbers. If these ever diverge, the design has quietly forked.
 */
describe('web / native parity', () => {
  it('produces identical geometry and colour for every level, state and scheme', () => {
    for (const scheme of SCHEMES) {
      for (const level of [1, 2, 3] as const) {
        for (const state of ['raised', 'pressed', 'flat'] as const) {
          const web = clayShadow({ scheme, level, state });
          const native = clayNative({ scheme, level, state });

          if (state === 'flat') {
            expect(web).toBe('none');
            expect(native.boxShadow).toHaveLength(0);
            continue;
          }

          const rebuilt = native.boxShadow
            .map((l) =>
              `${l.inset ? 'inset ' : ''}${l.offsetX}px ${l.offsetY}px ${l.blurRadius}px ${l.color}`)
            .join(', ');
          expect(rebuilt, `${scheme}/${level}/${state}`).toBe(web);
        }
      }
    }
  });

  it('picks the same fill for a pressed tile on both platforms', () => {
    for (const scheme of SCHEMES) {
      expect(clayNative({ scheme, state: 'pressed' }).backgroundColor).toBe(palette[scheme].sunken);
      expect(clayNative({ scheme, state: 'raised' }).backgroundColor).toBe(palette[scheme].surface);
    }
  });
});
