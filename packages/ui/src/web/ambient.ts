/**
 * Ambient background music, synthesised in the browser.
 *
 * No audio files. That is not a shortcut — it is the only version of this
 * feature that fits the product: no hosting, no licensing, and no bytes over a
 * metered connection, which matters for an audience that counts its data. It
 * also means the music can follow the category, which a fixed loop could not.
 *
 * Musically it is a slow arpeggio over a pentatonic scale with a soft pad
 * underneath. Pentatonic because any two notes in it sound consonant together,
 * so a randomised sequence cannot produce a wrong note — which is what makes
 * generative background music tolerable for more than a minute.
 */

/** A minor pentatonic scale in semitones from the root. */
const PENTATONIC = [0, 3, 5, 7, 10];

/** Root note per category family, so the feed shifts key as the subject shifts. */
function rootFor(categoryId: number): number {
  // A/220Hz upward through the scale degrees; the modulus keeps it in one octave
  // so consecutive cards never lurch by more than a few semitones.
  const degrees = [0, 3, 5, 7, 10, 12, 15];
  return 220 * Math.pow(2, degrees[categoryId % degrees.length]! / 12);
}

export interface AmbientHandle {
  setCategory(categoryId: number): void;
  stop(): void;
  readonly running: boolean;
}

export function startAmbient(initialCategory = 0): AmbientHandle | null {
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  // Quiet on purpose. This sits under reading, not over it.
  master.gain.value = 0.0;
  master.connect(ctx.destination);

  // A gentle low-pass keeps the synthesis from sounding like a test tone.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.6;
  filter.connect(master);

  // Fade in rather than starting abruptly.
  master.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 2.5);

  let root = rootFor(initialCategory);
  let stopped = false;
  let timer: number | undefined;

  /** A pad: two detuned sines an octave apart, held and slowly re-pitched. */
  const padA = ctx.createOscillator();
  const padB = ctx.createOscillator();
  const padGain = ctx.createGain();
  padGain.gain.value = 0.35;
  padA.type = 'sine';
  padB.type = 'sine';
  padA.frequency.value = root / 2;
  padB.frequency.value = root / 2 + 0.7; // slight detune, for movement
  padA.connect(padGain);
  padB.connect(padGain);
  padGain.connect(filter);
  padA.start();
  padB.start();

  function pluck(freq: number, at: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    // A percussive envelope; a sustained note would fight the pad.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 2.6);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(at);
    osc.stop(at + 2.7);
  }

  function schedule() {
    if (stopped) return;
    const now = ctx.currentTime;
    // Two or three notes per bar, placed loosely so it never sounds metronomic.
    const count = 2 + Math.floor(Math.random() * 2);
    for (let n = 0; n < count; n++) {
      const degree = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]!;
      const octave = Math.random() < 0.3 ? 2 : 1;
      pluck(root * octave * Math.pow(2, degree / 12), now + n * 1.1 + Math.random() * 0.4);
    }
    timer = window.setTimeout(schedule, 3400);
  }
  schedule();

  return {
    get running() { return !stopped; },
    setCategory(categoryId: number) {
      if (stopped) return;
      root = rootFor(categoryId);
      // Glide rather than jump: an instant key change between cards is jarring.
      padA.frequency.linearRampToValueAtTime(root / 2, ctx.currentTime + 1.8);
      padB.frequency.linearRampToValueAtTime(root / 2 + 0.7, ctx.currentTime + 1.8);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) window.clearTimeout(timer);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      window.setTimeout(() => { padA.stop(); padB.stop(); void ctx.close(); }, 900);
    },
  };
}
