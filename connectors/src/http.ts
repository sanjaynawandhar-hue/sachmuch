import { RateLimited, SourceError } from './types';

/**
 * Wikimedia requires a descriptive User-Agent with a contact URL on every
 * request, and will block a generic one. It is set globally here rather than
 * per-connector so a new connector cannot forget it.
 */
export const USER_AGENT =
  process.env.SACHMUCH_USER_AGENT ??
  'SachmuchBot/0.1 (https://sachmuch.com; sanjay.nawandhar@gmail.com) node-fetch';

interface Bucket {
  tokens: number;
  lastRefill: number;
  rpm: number;
  /** Set while a 429 backoff is in force. */
  pausedUntil: number;
}

const buckets = new Map<string, Bucket>();

function bucketFor(sourceId: string, rpm: number): Bucket {
  let b = buckets.get(sourceId);
  if (!b) {
    b = { tokens: rpm, lastRefill: Date.now(), rpm, pausedUntil: 0 };
    buckets.set(sourceId, b);
  }
  return b;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Token bucket, per source. We are crawling once, not continuously. */
async function takeToken(sourceId: string, rpm: number): Promise<void> {
  const b = bucketFor(sourceId, rpm);
  const now = Date.now();
  if (b.pausedUntil > now) await sleep(b.pausedUntil - now);

  const elapsed = Date.now() - b.lastRefill;
  b.tokens = Math.min(b.rpm, b.tokens + (elapsed / 60_000) * b.rpm);
  b.lastRefill = Date.now();

  if (b.tokens < 1) {
    await sleep(Math.ceil(((1 - b.tokens) / b.rpm) * 60_000));
    b.tokens = 0;
    b.lastRefill = Date.now();
    return;
  }
  b.tokens -= 1;
}

export function pauseSource(sourceId: string, ms: number): void {
  const b = buckets.get(sourceId);
  if (b) b.pausedUntil = Date.now() + ms;
}

/** Exposed for tests, which need a clean bucket per case. */
export function resetRateLimits(): void {
  buckets.clear();
}

export interface PoliteFetchOptions {
  sourceId: string;
  rateLimitRpm: number;
  headers?: Record<string, string>;
  /** Total attempts including the first. */
  maxAttempts?: number;
  timeoutMs?: number;
  method?: 'GET' | 'HEAD' | 'POST';
  body?: string;
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * One HTTP call with rate limiting, timeout and exponential backoff.
 *
 * A 429 or 5xx pauses THIS source only — the orchestrator keeps running every
 * other source, because a dead source must not stall the run.
 */
export async function politeFetch(url: string, opts: PoliteFetchOptions): Promise<Response> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const timeoutMs = opts.timeoutMs ?? 65_000;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await takeToken(opts.sourceId, opts.rateLimitRpm);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: { 'user-agent': USER_AGENT, 'accept-encoding': 'gzip', ...opts.headers },
        ...(opts.body ? { body: opts.body } : {}),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timer);
      if (attempt === maxAttempts) {
        throw new SourceError(opts.sourceId, `network failure: ${(e as Error).message}`);
      }
      await sleep(backoffMs(attempt));
      continue;
    }
    clearTimeout(timer);

    if (res.ok) return res;
    lastStatus = res.status;

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt);
      pauseSource(opts.sourceId, waitMs);
      if (attempt === maxAttempts) throw new RateLimited(waitMs, opts.sourceId);
      await sleep(waitMs);
      continue;
    }

    if (RETRYABLE.has(res.status) && attempt < maxAttempts) {
      await sleep(backoffMs(attempt));
      continue;
    }

    throw new SourceError(opts.sourceId, `HTTP ${res.status} for ${url}`, res.status);
  }

  throw new SourceError(opts.sourceId, `exhausted ${maxAttempts} attempts`, lastStatus);
}

/** 1s, 2s, 4s, 8s with jitter, capped. */
export function backoffMs(attempt: number): number {
  const base = Math.min(2 ** (attempt - 1) * 1000, 30_000);
  return base + Math.floor(Math.random() * 400);
}

export async function fetchJson<T>(url: string, opts: PoliteFetchOptions): Promise<T> {
  const res = await politeFetch(url, { ...opts, headers: { accept: 'application/json', ...opts.headers } });
  return (await res.json()) as T;
}
