'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { LikeBurst } from './LikeBurst';
import { Byline } from './Byline';
import { radius } from '../tokens/space';
import { cssTypeStyle, scriptOf, type TypeScaleKey } from '../tokens/type';
import { t } from '../strings';
import type { FactCardData, Lang } from '../types';

export interface FactCardProps {
  fact: FactCardData;
  lang: Lang;
  typeScale?: TypeScaleKey;
  /** Category position, used to read that category's tint from CSS variables. */
  tintIndex?: number;
  onEntityPress?(qid: string): void;
  onLike?(): void;
  onSave?(): void;
  /** Counts a boost. Nothing is posted anywhere — see the rail button below. */
  onBoost?(): void;
  /** Running boost total, shown under the button. */
  boostCount?: number;
  onReport?(): void;
  /** Reported so the feed can count 'opened the body' as a strong signal. */
  onExpandChange?(open: boolean): void;
  dataSaver?: boolean;
}

/**
 * A full-bleed feed card.
 *
 * The card face carries the fact and nothing else: no publisher line, no
 * licence credit, no row of labelled buttons. Provenance has not been dropped —
 * the source, publisher and corroboration count all live one tap away behind
 * the ⓘ, so a fact stays traceable without the feed looking like a citation.
 *
 * Actions are three icons on a right rail rather than five labelled buttons
 * repeated on every card.
 */
export function FactCard({
  fact, lang, typeScale = 'default', tintIndex, dataSaver = false,
  onEntityPress, onLike, onSave, onBoost, boostCount = 0, onReport, onExpandChange,
}: FactCardProps) {
  const [open, setOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);
  // Incremented on every like so the burst re-fires even on a repeat tap.
  const [burst, setBurst] = useState(0);
  const boosted = useRef(false);
  const script = scriptOf(fact.hook);

  const i = tintIndex ?? fact.categoryId - 1;
  const gradient = `var(--cat-${i}-gradient, var(--brand-gradient))`;
  const accent = `var(--cat-${i}-accent, var(--clay-ink))`;

  const hookStyle: CSSProperties = {
    ...cssTypeStyle(open ? 'title' : 'display', script, typeScale),
    margin: 0,
    transition: 'font-size 220ms var(--ease-swipe)',
  };
  const bodyStyle: CSSProperties = { ...cssTypeStyle('body', script, typeScale), margin: 0 };
  const captionStyle: CSSProperties = { ...cssTypeStyle('caption', script, typeScale), margin: 0 };

  return (
    <article
      onClick={() => setOpen((v) => { onExpandChange?.(!v); return !v; })}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        borderRadius: radius.xl,
        background: `var(--cat-${i}-bg, var(--clay-bg))`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'var(--space-xl)',
        paddingBottom: 'var(--space-xxl)',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={`${fact.categoryLabel}: ${fact.hook}`}
    >
      {/* Category glow. The colour lives here and in the chip, never behind the
          body text, which is how a vivid feed stays readable. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-22%',
          right: '-28%',
          width: '85%',
          height: '52%',
          borderRadius: '50%',
          background: gradient,
          filter: 'blur(64px)',
          opacity: 0.42,
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, var(--clay-bg) 6%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />

      {/* No category chip here: the rail above the feed already names the
          category, and showing it twice was the repetition it looked like.
          The glyph fills the upper card the way a still frame would, at an
          opacity low enough that it never competes with the hook. */}
      {fact.image && !dataSaver ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fact.image.url}
            alt={fact.image.alt}
            loading="lazy"
            decoding="async"
            style={{
              // Full bleed rather than a band across the top: a fixed-height
              // image leaves a hard horizontal edge where it stops, which no
              // amount of gradient below it can disguise.
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 28%',
              pointerEvents: 'none',
            }}
          />
          {/* A scrim, not a dim: the hook has to stay readable over a photograph
              of any brightness, and a flat overlay would grey out the picture. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              // Opaque behind the hook, clearing entirely by the upper third, so
              // the text is always legible and the picture is never just dimmed.
              background:
                'linear-gradient(to top, var(--cat-' + i + '-bg, var(--clay-bg)) 30%, ' +
                'color-mix(in srgb, var(--clay-bg) 82%, transparent) 44%, ' +
                'color-mix(in srgb, var(--clay-bg) 35%, transparent) 62%, transparent 82%)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '4%',
            left: '4%',
            fontSize: 190,
            lineHeight: 1,
            opacity: 0.13,
            filter: 'saturate(0.7)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {fact.categoryEmoji}
        </span>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-lg)',
          // Keep the text clear of the action rail rather than running under it.
          paddingRight: 58,
          maxHeight: '100%',
          overflowY: open ? 'auto' : 'visible',
        }}
      >
        <p style={{ ...hookStyle, color: 'var(--clay-ink)' }}>{fact.hook}</p>

        {/* The signature. On every card, because every card can be screenshotted. */}
        <Byline size={12} />

        {open && (
          <>
            <p style={{ ...bodyStyle, color: 'var(--clay-ink-soft)' }}>{fact.body}</p>
            {fact.entities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                {fact.entities.map((e) => (
                  <button
                    key={e.qid}
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); onEntityPress?.(e.qid); }}
                    style={{
                      ...captionStyle,
                      appearance: 'none',
                      border: '1px solid color-mix(in srgb, var(--clay-ink) 18%, transparent)',
                      background: 'transparent',
                      borderRadius: radius.pill,
                      padding: '6px 14px',
                      color: accent,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {showSource && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...captionStyle,
              background: 'var(--clay-surface)',
              borderRadius: radius.md,
              padding: 'var(--space-md)',
              color: 'var(--clay-ink-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <span>
              {t('source', lang)}:{' '}
              <a href={fact.sourceUrl} target="_blank" rel="noreferrer noopener" style={{ color: accent }}>
                {fact.publisher}
              </a>
            </span>
            {fact.corroborationCount >= 2 && (
              <span style={{ color: 'var(--clay-jade)' }}>
                {fact.corroborationCount} {t('sources', lang)}
              </span>
            )}
            {fact.attributionText && !dataSaver && <span>{fact.attributionText}</span>}
            {fact.image?.credit && (
              <span style={{ opacity: 0.85 }}>
                Photo: {fact.image.credit}
                {fact.image.licence ? ` · ${fact.image.licence}` : ''}
              </span>
            )}
            <button
              type="button"
              onClick={onReport}
              style={{ ...captionStyle, appearance: 'none', border: 'none', background: 'transparent',
                       color: 'var(--clay-rose, var(--clay-ink-soft))', cursor: 'pointer', textAlign: 'start', padding: 0 }}
            >
              {t('report', lang)}
            </button>
          </div>
        )}
      </div>

      {/* Right rail. Icons only — the labelled five-button row read as clutter
          repeated on every single card. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 'var(--space-lg)',
          bottom: 'var(--space-xxxl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-lg)',
        }}
      >
        <span style={{ position: 'relative' }}>
          <LikeBurst fireKey={burst} />
          <RailButton
            label={t('like', lang)}
            active={fact.liked}
            onPress={() => { if (!fact.liked) setBurst((b) => b + 1); onLike?.(); }}
          >
            {fact.liked ? '❤️' : '🤍'}
          </RailButton>
        </span>
        <RailButton label={t('save', lang)} active={fact.saved} onPress={onSave}>🔖</RailButton>
        {/* Boost, not share. Nothing leaves the app: it records that a reader
            thought this fact deserved a wider audience, and the feed ranks on it.
            A share button that silently posts nothing would be a lie; a boost
            button that visibly counts is an honest signal. */}
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <RailButton
            label={t('boost', lang)}
            active={boosted.current}
            onPress={() => { if (!boosted.current) { boosted.current = true; onBoost?.(); } }}
          >
            🚀
          </RailButton>
          {boostCount > 0 && (
            <span style={{ ...captionStyle, color: 'var(--clay-ink-soft)', fontWeight: 700 }}>
              {boostCount}
            </span>
          )}
        </span>
        <RailButton label={t('source', lang)} active={showSource} onPress={() => setShowSource((v) => !v)}>
          ⓘ
        </RailButton>
      </div>
    </article>
  );
}

function RailButton({
  children, label, onPress, active,
}: { children: React.ReactNode; label: string; onPress?(): void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      aria-pressed={active ?? undefined}
      style={{
        appearance: 'none',
        cursor: 'pointer',
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        fontSize: 19,
        // Mixed from the ink, not hardcoded white: a translucent white pill is
        // invisible on the light scheme's near-white card.
        background: active
          ? 'color-mix(in srgb, var(--clay-ink) 24%, transparent)'
          : 'color-mix(in srgb, var(--clay-ink) 11%, transparent)',
        border: '1px solid color-mix(in srgb, var(--clay-ink) 16%, transparent)',
        backdropFilter: 'blur(10px)',
        transition: 'transform 180ms var(--ease-press), background 180ms var(--ease-press)',
      }}
      onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.88)'; }}
      onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}
