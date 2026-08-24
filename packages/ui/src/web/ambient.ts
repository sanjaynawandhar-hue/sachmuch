/**
 * Ambient background music, synthesised in the browser.
 *
 * No audio files. That is not a shortcut — it is the only version that fits the
 * product: no hosting, no licensing, and no bytes over a metered connection,
 * which matters for an audience that counts its data. It also lets the music
 * follow the subject, which a fixed loop could not.
 *
 * The scales are deliberately pentatonic or raga-derived. In a pentatonic scale
 * any two notes sound consonant together, so a randomised sequence cannot
 * produce a wrong note — which is the whole reason generative background music
 * is bearable past the first minute.
 */

/* ─────────────────────────── scales ─────────────────────────── */

interface Mode {
  name: string;
  /** Semitones from the root. */
  degrees: number[];
}

const MODES: Mode[] = [
  // Bhupali — the major pentatonic. Open and bright; the safest of the set.
  { name: 'bhupali', degrees: [0, 2, 4, 7, 9] },
  // Dhani — minor pentatonic. Wistful, and the most "background" of them.
  { name: 'dhani', degrees: [0, 3, 5, 7, 10] },
  // Durga — pentatonic with a suspended fourth; neither major nor minor.
  { name: 'durga', degrees: [0, 2, 5, 7, 9] },
  // Kalyan flavour — the raised fourth gives it a floating, unresolved feel.
  { name: 'kalyan', degrees: [0, 2, 4, 6, 7, 9] },
  // Kafi flavour — soft minor, closest to Dorian.
  { name: 'kafi', degrees: [0, 2, 3, 5, 7, 9] },
];

/* ────────────────────────── instruments ─────────────────────── */

interface Voice {
  name: string;
  /** Builds one note. `at` is an AudioContext timestamp. */
  play(ctx: AudioContext, out: AudioNode, freq: number, at: number): void;
  /** Seconds between note clusters; slower voices want more room. */
  spacing: number;
}

/** Shared envelope helper: exponential ramps avoid the click a linear one makes. */
function envelope(gain: GainNode, at: number, peak: number, attack: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

const VOICES: Voice[] = [
  {
    name: 'pluck',
    spacing: 3.4,
    play(ctx, out, freq, at) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      envelope(g, at, 0.22, 0.03, 2.5);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + 2.8);
    },
  },
  {
    name: 'bell',
    spacing: 4.6,
    play(ctx, out, freq, at) {
      // A bell is a fundamental plus an inharmonic partial; the slight detune of
      // the upper voice is what stops it sounding like a plain sine beep.
      for (const [mult, level, decay] of [[1, 0.16, 4.2], [2.76, 0.05, 2.6]] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * mult;
        envelope(g, at, level, 0.01, decay);
        osc.connect(g).connect(out);
        osc.start(at);
        osc.stop(at + decay + 0.3);
      }
    },
  },
  {
    name: 'marimba',
    spacing: 2.6,
    play(ctx, out, freq, at) {
      // Wooden: a short body with a hard, fast decay and no sustain at all.
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      envelope(g, at, 0.24, 0.005, 0.85);
      const click = ctx.createOscillator();
      const cg = ctx.createGain();
      click.type = 'triangle';
      click.frequency.value = freq * 4;
      envelope(cg, at, 0.05, 0.002, 0.09);
      osc.connect(g).connect(out);
      click.connect(cg).connect(out);
      osc.start(at); osc.stop(at + 1.1);
      click.start(at); click.stop(at + 0.15);
    },
  },
  {
    name: 'kalimba',
    spacing: 2.9,
    play(ctx, out, freq, at) {
      // Thumb piano: metallic, two closely detuned voices beating against each other.
      for (const detune of [0, 3.5]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        envelope(g, at, 0.15, 0.008, 1.6);
        osc.connect(g).connect(out);
        osc.start(at);
        osc.stop(at + 1.9);
      }
    },
  },
  {
    name: 'swell',
    spacing: 6.2,
    play(ctx, out, freq, at) {
      // Bowed: slow in, slow out. Almost no attack transient.
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(400, at);
      lp.frequency.linearRampToValueAtTime(1100, at + 2);
      envelope(g, at, 0.09, 1.6, 3.4);
      osc.connect(lp).connect(g).connect(out);
      osc.start(at);
      osc.stop(at + 5.4);
    },
  },
];

/* ───────────────────────────── engine ───────────────────────── */

/** Root note per category, so the feed shifts key as the subject shifts. */
function rootFor(categoryId: number): number {
  const steps = [0, 3, 5, 7, 10, 12, 15, 17];
  return 196 * Math.pow(2, steps[categoryId % steps.length]! / 12);
}

export interface AmbientHandle {
  setCategory(categoryId: number): void;
  stop(): void;
  /** Which voice and mode this session drew, for the settings screen. */
  readonly describe: string;
  readonly running: boolean;
}

export interface AmbientOptions {
  categoryId?: number;
  /** Force a particular voice; otherwise one is drawn at random. */
  voice?: string;
  random?: () => number;
}

/**
 * Starts the music. Returns null when Web Audio is unavailable.
 *
 * MUST be called from a user gesture. Browsers suspend an AudioContext created
 * without one, and a suspended context fails silently — the toggle looks on and
 * nothing plays.
 */
export function startAmbient(opts: AmbientOptions = {}): AmbientHandle | null {
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const random = opts.random ?? Math.random;
  const ctx = new Ctor();
  // Safari and Chrome both hand back a suspended context when the gesture is
  // even slightly indirect; resuming is harmless when it is already running.
  void ctx.resume();

  const voice = opts.voice
    ? (VOICES.find((v) => v.name === opts.voice) ?? VOICES[0]!)
    : VOICES[Math.floor(random() * VOICES.length)]!;
  const mode = MODES[Math.floor(random() * MODES.length)]!;

  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  filter.Q.value = 0.5;
  filter.connect(master);

  // Fade in. Starting at full level on the first note is jarring on a feed the
  // user has just opened.
  master.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3);

  let root = rootFor(opts.categoryId ?? 0);
  let stopped = false;
  let timer: number | undefined;

  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.type = 'sine';
  drone.frequency.value = root / 2;
  droneGain.gain.value = 0.30;
  drone.connect(droneGain).connect(filter);
  drone.start();

  function schedule() {
    if (stopped) return;
    const now = ctx.currentTime;
    const count = 2 + Math.floor(random() * 2);
    for (let n = 0; n < count; n++) {
      const degree = mode.degrees[Math.floor(random() * mode.degrees.length)]!;
      const octave = random() < 0.25 ? 2 : 1;
      voice.play(ctx, filter, root * octave * Math.pow(2, degree / 12),
        now + n * (voice.spacing / 3) + random() * 0.35);
    }
    timer = window.setTimeout(schedule, voice.spacing * 1000);
  }
  schedule();

  return {
    describe: `${voice.name} · ${mode.name}`,
    get running() { return !stopped; },
    setCategory(categoryId: number) {
      if (stopped) return;
      root = rootFor(categoryId);
      // Glide, never jump: an instant key change between cards is jarring.
      drone.frequency.linearRampToValueAtTime(root / 2, ctx.currentTime + 2.2);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (timer) window.clearTimeout(timer);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      window.setTimeout(() => { try { drone.stop(); } catch { /* already stopped */ } void ctx.close(); }, 800);
    },
  };
}

export const AMBIENT_VOICES = VOICES.map((v) => v.name);
export const AMBIENT_MODES = MODES.map((m) => m.name);
