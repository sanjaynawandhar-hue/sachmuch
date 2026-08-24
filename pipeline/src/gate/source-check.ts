import { politeFetch } from '@sachmuch/connectors';
import type { FactDraft } from '@sachmuch/templates';
import type { GateFinding } from './structural';

/**
 * §7.2 — the source must actually resolve. Dead link, no publish.
 *
 * This is the single most expensive gate rule, so it runs last and its results
 * are cached per URL for a run: a template producing 800 facts about Bollywood
 * awards will point at a few hundred distinct Wikipedia articles, and checking
 * each one once is the difference between a minute and an hour.
 */

const cache = new Map<string, boolean>();

export function resetSourceCheckCache(): void {
  cache.clear();
}

export interface SourceCheckOptions {
  sourceId: string;
  rateLimitRpm: number;
  /** Skip the network entirely — used by tests and by dry runs. */
  offline?: boolean;
}

export async function checkSourceUrl(url: string, opts: SourceCheckOptions): Promise<boolean> {
  if (opts.offline) return /^https?:\/\//.test(url);
  const hit = cache.get(url);
  if (hit !== undefined) return hit;

  let ok = false;
  try {
    // HEAD first; some hosts refuse it, so a 405 falls through to a ranged GET.
    const res = await politeFetch(url, {
      sourceId: opts.sourceId,
      rateLimitRpm: opts.rateLimitRpm,
      method: 'HEAD',
      maxAttempts: 2,
      timeoutMs: 15_000,
    });
    ok = res.status >= 200 && res.status < 400;
  } catch {
    try {
      const res = await politeFetch(url, {
        sourceId: opts.sourceId,
        rateLimitRpm: opts.rateLimitRpm,
        headers: { range: 'bytes=0-0' },
        maxAttempts: 2,
        timeoutMs: 15_000,
      });
      ok = res.status >= 200 && res.status < 400;
    } catch {
      ok = false;
    }
  }

  cache.set(url, ok);
  return ok;
}

export async function checkSource(d: FactDraft, opts: SourceCheckOptions): Promise<GateFinding[]> {
  if (!/^https?:\/\//.test(d.sourceUrl)) {
    return [{ rule: 'source.malformed', detail: d.sourceUrl }];
  }
  if (!d.sourceUrl.startsWith('https://')) {
    // §5.2 flags Numbers API as HTTP-only. Server-side fetching is fine, but a
    // fact whose citation is plain HTTP would be blocked as mixed content on the
    // web client, so it never becomes the displayed source.
    return [{ rule: 'source.not_https', detail: d.sourceUrl }];
  }
  const ok = await checkSourceUrl(d.sourceUrl, opts);
  return ok ? [] : [{ rule: 'source.unreachable', detail: d.sourceUrl }];
}
