'use client';

import { useMemo, useState } from 'react';
import { Feed, Wordmark } from '@sachmuch/ui/web';
import type { FactCardData } from '@sachmuch/ui';

export interface FeedShellProps {
  /** Every live fact, with its Hindi rendering where one exists. */
  facts: { en: FactCardData; hi?: FactCardData }[];
}

/**
 * The app shell.
 *
 * Switching to Hindi does not translate anything — it selects the Hindi
 * rendering the pipeline already produced, and drops the facts that never got
 * one. That is why the Hindi feed is smaller than the English one, and why it
 * is never machine-mangled.
 */
export function FeedShell({ facts }: FeedShellProps) {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [music, setMusic] = useState(false);

  const visible = useMemo(
    () => (lang === 'en' ? facts.map((f) => f.en) : facts.flatMap((f) => (f.hi ? [f.hi] : []))),
    [facts, lang],
  );

  return (
    <main
      style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        gap: 'var(--space-md)', padding: 'var(--space-lg)',
        maxWidth: 560, margin: '0 auto', minHeight: 0,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
        <Wordmark size={34} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <button
            type="button"
            onClick={() => setMusic((m) => !m)}
            aria-pressed={music}
            aria-label={music ? 'Turn music off' : 'Turn music on'}
            style={{
              appearance: 'none', border: 'none', cursor: 'pointer',
              width: 38, height: 38, borderRadius: 999, fontSize: 15,
              color: 'var(--clay-ink)',
              background: music ? 'var(--brand-gradient)' : 'var(--clay-surface)',
              boxShadow: music ? 'none' : 'var(--clay-raised-1)',
            }}
          >
            {music ? '🎵' : '🔇'}
          </button>
          <LangToggle lang={lang} onChange={setLang} hindiCount={facts.filter((f) => f.hi).length} />
        </div>
      </header>

      {visible.length > 0 ? (
        <Feed facts={visible} lang={lang} music={music} storageKey={`sachmuch.affinity.${lang}`} />
      ) : (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--clay-ink-soft)' }}>
          {lang === 'hi' ? 'अभी हिंदी में कोई तथ्य नहीं' : 'No facts yet'}
        </div>
      )}
    </main>
  );
}

function LangToggle({
  lang, onChange, hindiCount,
}: { lang: 'en' | 'hi'; onChange(l: 'en' | 'hi'): void; hindiCount: number }) {
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'flex', padding: 3, borderRadius: 999,
        background: 'var(--clay-surface)', boxShadow: 'var(--clay-pressed-1)',
      }}
    >
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          title={l === 'hi' ? `${hindiCount} facts available in Hindi` : undefined}
          style={{
            appearance: 'none', border: 'none', cursor: 'pointer',
            padding: '7px 15px', borderRadius: 999, fontSize: 13, fontWeight: 700,
            fontFamily: l === 'hi' ? 'var(--font-noto-devanagari)' : 'var(--font-mulish)',
            color: lang === l ? 'var(--clay-on-accent)' : 'var(--clay-ink-soft)',
            background: lang === l ? 'var(--brand-gradient)' : 'transparent',
            transition: 'background 200ms var(--ease-standard)',
          }}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
