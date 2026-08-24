'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildFeed, deserializeAffinity, emptyAffinity, learn, serializeAffinity,
  type Affinity, type FactSignal,
} from '@sachmuch/core';
import { FactCard } from './FactCard';
import { startAmbient, type AmbientHandle } from './ambient';
import { radius } from '../tokens/space';
import { cssTypeStyle } from '../tokens/type';
import type { FactCardData, Lang } from '../types';

export interface FeedProps {
  /** Background music. Off unless the reader asks for it — see the effect below. */
  music?: boolean;
  /** The whole corpus available to this session. Order here is not the feed order. */
  facts: FactCardData[];
  lang: Lang;
  onEntityPress?(qid: string): void;
  /** Where the learned affinity is persisted. Swap for a server call later. */
  storageKey?: string;
}

/** Past this fraction of the axis, or this flick speed, the card advances. */
const DISTANCE_RATIO = 0.2;
const VELOCITY_PX_PER_MS = 0.4;

/**
 * How far past the ends the feed will stretch before refusing.
 *
 * A card that simply stops dead under the finger feels broken; one that keeps
 * following feels like the list has no end. Rubber-banding — movement that
 * decays the further you pull — is what tells a thumb it has reached a limit
 * without the motion stopping.
 */
function rubberBand(distance: number, dimension: number): number {
  const c = 0.55;
  return (distance * dimension * c) / (dimension + c * Math.abs(distance));
}

/**
 * Duration for the settling animation.
 *
 * A fixed duration is what makes a swipe feel wrong: a hard flick that has
 * already travelled most of the width still waits the full time, so the card
 * appears to hesitate before catching up. Deriving it from the distance left to
 * travel and the speed the finger was moving keeps the motion continuous with
 * the gesture that started it.
 */
function settleMs(remainingPx: number, velocityPxPerMs: number): number {
  const speed = Math.max(velocityPxPerMs, 0.35);
  return Math.round(Math.min(420, Math.max(160, Math.abs(remainingPx) / speed)));
}
/** Rebuild the queue when this few cards remain, so it never runs out. */
const REFILL_AT = 4;

/**
 * One dynamic feed.
 *
 * There are no category tabs. Every card is chosen from the whole corpus by
 * `buildFeed`, weighted by what this reader has actually engaged with, with a
 * steady minority picked at random so the feed cannot narrow to two topics.
 *
 * Both axes advance the feed — horizontal and vertical do the same thing —
 * because with a single mixed stream there is no second dimension to navigate.
 * Every gesture keeps a visible button equivalent.
 */
export function Feed({ facts, lang, onEntityPress, music = false, storageKey = 'sachmuch.affinity' }: FeedProps) {
  const [affinity, setAffinity] = useState<Affinity>(emptyAffinity);
  const [queue, setQueue] = useState<FactCardData[]>([]);
  const [pos, setPos] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; axis: 'x' | 'y' | null }>({ x: 0, y: 0, axis: null });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  /** Optimistic boost totals, so the number moves the instant it is tapped. */
  const [boosts, setBoosts] = useState<Record<string, number>>({});
  const likedRef = useRef(liked);
  const savedRef = useRef(saved);
  likedRef.current = liked;
  savedRef.current = saved;

  const pointer = useRef<
    { x: number; y: number; t: number; axis: 'x' | 'y' | null; lastX: number; lastY: number; lastT: number } | null
  >(null);
  /** Set at release so the settle animation matches the speed of the flick. */
  const settle = useRef(220);
  const box = useRef<HTMLDivElement>(null);
  /** When the current card came into view, and what has happened to it since. */
  const shown = useRef<{ at: number; expanded: boolean }>({ at: Date.now(), expanded: false });
  const ambient = useRef<AmbientHandle | null>(null);
  const affinityRef = useRef(affinity);
  affinityRef.current = affinity;
  /**
   * Position and queue are mirrored into refs for the same reason the gesture
   * axis is: React batches, so two taps of "next" inside one frame both run
   * against the render's stale `pos`. That attributed both dwell signals to the
   * same card and skipped the one in between entirely. State drives rendering;
   * refs drive the bookkeeping.
   */
  const posRef = useRef(0);
  const queueRef = useRef<FactCardData[]>([]);
  posRef.current = pos;
  queueRef.current = queue;

  useEffect(() => {
    const stored = deserializeAffinity(
      typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey),
    );
    setAffinity(stored);
    affinityRef.current = stored;
    const initial = buildFeed(facts, stored, 24);
    queueRef.current = initial;
    setQueue(initial);
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(m.matches);
    const on = () => setReduceMotion(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [facts, storageKey]);

  const current = queue[pos];

  /**
   * Music starts on the reader's FIRST INTERACTION, not on load.
   *
   * This is not a design preference, it is how browsers work: an AudioContext
   * created without a user gesture is handed back suspended, and a suspended
   * context fails silently — the toggle would read "on" and nothing would play.
   * So when music is enabled the engine waits, armed, for the first tap or
   * swipe, and starts then. To the reader it is on from the moment they touch
   * the feed, which is the first moment it could ever have been.
   */
  useEffect(() => {
    if (!music) {
      ambient.current?.stop();
      ambient.current = null;
      return;
    }
    if (ambient.current) return;

    const begin = () => {
      if (ambient.current) return;
      ambient.current = startAmbient({ categoryId: current?.categoryId ?? 0 });
    };
    // Try immediately: on a repeat visit the page may already carry a gesture.
    begin();
    if (ambient.current) return;

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
    const once = () => {
      begin();
      for (const e of events) window.removeEventListener(e, once);
    };
    for (const e of events) window.addEventListener(e, once, { once: true, passive: true });
    return () => { for (const e of events) window.removeEventListener(e, once); };
  }, [music]);

  useEffect(() => () => { ambient.current?.stop(); ambient.current = null; }, []);

  // The key follows the subject, gliding rather than jumping between cards.
  useEffect(() => {
    if (current) ambient.current?.setCategory(current.categoryId);
  }, [current?.categoryId]);

  /**
   * Record what happened on the card being left, then learn from it. This is
   * the only place the model is updated, so every card contributes exactly once.
   */
  const commitAndAdvance = useCallback((delta: number) => {
    const leaving = queueRef.current[posRef.current];
    if (leaving) {
      const signal: FactSignal = {
        factId: leaving.id,
        categoryId: leaving.categoryId,
        dwellMs: Date.now() - shown.current.at,
        expanded: shown.current.expanded,
        liked: Boolean(likedRef.current[leaving.id]),
        saved: Boolean(savedRef.current[leaving.id]),
      };
      const next = learn(affinityRef.current, signal);
      affinityRef.current = next;
      setAffinity(next);
      try {
        window.localStorage.setItem(storageKey, serializeAffinity(next));
      } catch {
        /* private mode or a full quota; the feed still works, it just forgets */
      }
    }

    shown.current = { at: Date.now(), expanded: false };

    const nextPos = Math.max(0, posRef.current + delta);
    posRef.current = nextPos;
    setPos(nextPos);

    // Rebuild from the refreshed model before the queue runs dry. There is no
    // end of feed and no empty state.
    if (nextPos >= queueRef.current.length - REFILL_AT) {
      const seen = new Set(queueRef.current.slice(0, nextPos + 1).map((f) => f.id));
      const unseen = facts.filter((f) => !seen.has(f.id));
      const fresh = buildFeed(unseen.length > 0 ? unseen : facts, affinityRef.current, 24);
      queueRef.current = [...queueRef.current, ...fresh];
      setQueue(queueRef.current);
    }
  }, [facts, storageKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') commitAndAdvance(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') commitAndAdvance(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitAndAdvance]);

  function onPointerDown(e: React.PointerEvent) {
    const now = performance.now();
    pointer.current = {
      x: e.clientX, y: e.clientY, t: now, axis: null,
      lastX: e.clientX, lastY: e.clientY, lastT: now,
    };
    // Capture on the container, not e.target: the card under the finger is
    // swapped out as the feed advances, and a capture held by an unmounted node
    // is lost mid-gesture. Guarded because it throws if the pointer is gone.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine without */ }
  }

  function onPointerMove(e: React.PointerEvent) {
    const p = pointer.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    const axis = p.axis ?? (Math.abs(dx) > 8 || Math.abs(dy) > 8
      ? (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y') : null);
    p.axis = axis;

    // Keep the most recent sample: velocity measured over the whole gesture
    // reads a slow drag that ends in a flick as slow, which is the opposite of
    // what the hand just did.
    p.lastX = e.clientX; p.lastY = e.clientY; p.lastT = performance.now();

    const rect = box.current?.getBoundingClientRect();
    const atStart = posRef.current === 0;
    let ox = axis === 'x' ? dx : 0;
    const oy = axis === 'y' ? dy : 0;
    // Nothing sits before the first card, so dragging back from it resists.
    if (atStart && ox > 0 && rect) ox = rubberBand(ox / rect.width, rect.width);
    setDrag({ x: ox, y: oy, axis });
  }

  function onPointerUp(e: React.PointerEvent) {
    const p = pointer.current;
    pointer.current = null;
    // The axis is read from the ref, not from state: React batches, so a quick
    // swipe can dispatch every move and the release before one re-render lands.
    const axis = p?.axis ?? null;
    const rect = box.current?.getBoundingClientRect();
    setDrag({ x: 0, y: 0, axis: null });
    if (!p || !rect || axis === null) return;

    const d = axis === 'x' ? e.clientX - p.x : e.clientY - p.y;
    const span = axis === 'x' ? rect.width : rect.height;

    // Velocity from the last few milliseconds of the gesture, not its average.
    const recent = Math.max(1, performance.now() - p.lastT + 8);
    const recentDelta = axis === 'x' ? e.clientX - p.lastX : e.clientY - p.lastY;
    const overall = Math.abs(d) / Math.max(1, performance.now() - p.t);
    const v = Math.max(Math.abs(recentDelta) / recent, overall);

    const advancing = Math.abs(d) > span * DISTANCE_RATIO || v > VELOCITY_PX_PER_MS;
    // Travel left to cover: to the edge if advancing, back to rest if not.
    settle.current = settleMs(advancing ? span - Math.abs(d) : Math.abs(d), v);
    if (advancing) commitAndAdvance(d < 0 ? 1 : -1);
  }

  if (!current) {
    return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--clay-ink-soft)' }} />;
  }

  // While a finger is down the card tracks it exactly; on release it settles
  // over a duration derived from how fast the finger was moving.
  const transition = drag.axis !== null || reduceMotion
    ? 'none'
    : `transform ${settle.current}ms cubic-bezier(0.17, 0.84, 0.34, 1),` +
      ` opacity ${settle.current}ms ease-out`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%', minHeight: 0 }}>
      <div
        ref={box}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative', flex: 1, minHeight: 0,
          touchAction: 'none', overflow: 'hidden', borderRadius: radius.xl,
        }}
      >
        {[-1, 0, 1].map((offset) => {
          const fact = queue[pos + offset];
          if (!fact) return null;
          return (
            <div
              key={`${pos + offset}:${fact.id}`}
              aria-hidden={offset !== 0}
              style={{
                position: 'absolute', inset: 0,
                transform:
                  `translate3d(calc(${offset * 100}% + ${drag.x}px), ${drag.y * 0.4}px, 0)` +
                  ` scale(${offset === 0 ? 1 - Math.min(Math.abs(drag.x) / 2600, 0.035) : 0.94})`,
                transition,
                opacity: offset === 0 ? 1 : 0.45,
                pointerEvents: offset === 0 ? 'auto' : 'none',
              }}
            >
              <FactCard
                fact={{ ...fact, liked: liked[fact.id] ?? false, saved: saved[fact.id] ?? false }}
                lang={lang}
                tintIndex={fact.categoryId - 1}
                onExpandChange={(isOpen) => { if (isOpen) shown.current.expanded = true; }}
                onLike={() => {
                  likedRef.current = { ...likedRef.current, [fact.id]: !likedRef.current[fact.id] };
                  setLiked(likedRef.current);
                }}
                onSave={() => {
                  savedRef.current = { ...savedRef.current, [fact.id]: !savedRef.current[fact.id] };
                  setSaved(savedRef.current);
                }}
                boostCount={boosts[fact.id] ?? fact.boostCount ?? 0}
                onBoost={() => {
                  const optimistic = (boosts[fact.id] ?? fact.boostCount ?? 0) + 1;
                  setBoosts((b) => ({ ...b, [fact.id]: optimistic }));
                  // Fire and forget: a boost that fails to record is not worth
                  // interrupting the feed for, and the count corrects on reload.
                  void fetch('/api/boost', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ factId: fact.id }),
                  })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((j: { boostCount?: number } | null) => {
                      if (j?.boostCount !== undefined) {
                        setBoosts((b) => ({ ...b, [fact.id]: j.boostCount! }));
                      }
                    })
                    .catch(() => {});
                }}
                {...(onEntityPress ? { onEntityPress } : {})}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
        <ArrowButton label={lang === 'hi' ? 'पिछला तथ्य' : 'Previous fact'} onPress={() => commitAndAdvance(-1)}>‹</ArrowButton>
        <span style={{ ...cssTypeStyle('caption'), color: 'var(--clay-ink-soft)' }}>
          {current.categoryEmoji} {current.categoryLabel}
        </span>
        <ArrowButton label={lang === 'hi' ? 'अगला तथ्य' : 'Next fact'} onPress={() => commitAndAdvance(1)}>›</ArrowButton>
      </div>
    </div>
  );
}

function ArrowButton({ children, label, onPress }: { children: React.ReactNode; label: string; onPress(): void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      style={{
        appearance: 'none', border: 'none', cursor: 'pointer',
        width: 46, height: 46, borderRadius: radius.pill, fontSize: 24, lineHeight: '46px',
        color: 'var(--clay-ink)', background: 'var(--clay-surface)', boxShadow: 'var(--clay-raised-1)',
      }}
    >
      {children}
    </button>
  );
}
