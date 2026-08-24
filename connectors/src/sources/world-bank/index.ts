import { draftFromRow, type FactDraft, type Row, type TemplateDef } from '@sachmuch/templates';
import { fetchJson } from '../../http';
import { SourceError, type Connector, type FetchResult, type Task } from '../../types';
import { countryBinding, countryIndex } from './countries';

const SOURCE_ID = 'world-bank';
const BASE = 'https://api.worldbank.org/v2';
const RPM = 60;

/**
 * A ranked row, computed by the connector rather than returned by the API.
 *
 * This is the fact shape that statistics accounts live on — "India ranks 137th
 * of 217" — and it is not something the World Bank hands you. The API returns a
 * flat list of values; the ranking, the country filtering and the choice of
 * which position is worth a card all happen here.
 */
export interface RankedRow {
  angle: 'india' | 'leader';
  iso3: string;
  value: number;
  rank: number;
  total: number;
  year: number;
  indicator: string;
  /** Only present on the 'india' angle: who is top, for the comparison. */
  leaderIso3?: string;
  leaderValue?: number;
}

interface WbValue {
  countryiso3code: string;
  date: string;
  value: number | null;
}

interface WbCountry {
  id: string;
  region?: { id: string };
}

let realCountries: Set<string> | null = null;

/**
 * The indicator endpoint mixes real countries with regional aggregates — "World",
 * "Low & middle income", "IBRD only". Ranking without filtering them out puts
 * "World" first in every population list. Aggregates are the entries whose
 * region id is 'NA'; that is the only reliable discriminator the API offers.
 */
async function loadRealCountries(): Promise<Set<string>> {
  if (realCountries) return realCountries;
  const [, rows] = await fetchJson<[unknown, WbCountry[]]>(
    `${BASE}/country?format=json&per_page=400`,
    { sourceId: SOURCE_ID, rateLimitRpm: RPM },
  );
  realCountries = new Set((rows ?? []).filter((c) => c.region?.id && c.region.id !== 'NA').map((c) => c.id));
  return realCountries;
}

export interface WorldBankDeps {
  templates: TemplateDef[];
}

/**
 * World Bank Indicators API.
 *
 * No key at all, CC BY 4.0, and it is the underlying source for most of the
 * cross-country statistics that circulate as social media graphics. Each
 * template names one indicator code in its `query` field; the connector fetches
 * it, ranks the real countries, and emits the two positions worth a card.
 */
export function createWorldBankConnector(deps: WorldBankDeps): Connector {
  const byId = new Map(deps.templates.map((t) => [t.id, t]));

  return {
    id: SOURCE_ID,
    kind: 'rest',
    publisher: 'The World Bank',
    homepage: 'https://data.worldbank.org',
    licence: 'cc_by',
    attributionRequired: true,
    attributionText: 'Source: World Bank Open Data, CC BY 4.0',
    rateLimitRpm: RPM,
    needsKey: false,
    schedule: '0 6 * * 1',

    async discover(): Promise<Task[]> {
      return deps.templates.map((t) => ({
        key: `${SOURCE_ID}:${t.id}`,
        templateId: t.id,
        categoryId: t.categoryId,
      }));
    },

    async fetch(task: Task): Promise<FetchResult> {
      const template = byId.get(task.templateId ?? '');
      if (!template) throw new SourceError(SOURCE_ID, `unknown template ${task.templateId}`);
      const indicator = template.query.trim();

      const countries = await loadRealCountries();
      // A five-year window, then the most recent value per country: indicators
      // are reported on different schedules, so a single year leaves large gaps.
      const [, values] = await fetchJson<[unknown, WbValue[] | null]>(
        `${BASE}/country/all/indicator/${indicator}?format=json&date=2019:2024&per_page=2000`,
        { sourceId: SOURCE_ID, rateLimitRpm: RPM },
      );

      const latest = new Map<string, WbValue>();
      for (const v of values ?? []) {
        if (v.value === null || !countries.has(v.countryiso3code)) continue;
        const prev = latest.get(v.countryiso3code);
        if (!prev || v.date > prev.date) latest.set(v.countryiso3code, v);
      }

      const descending = template.params?.ascending !== true;
      const sorted = [...latest.values()].sort((a, b) =>
        descending ? b.value! - a.value! : a.value! - b.value!);
      if (sorted.length < 30) return { rows: [] };

      const leader = sorted[0]!;
      const indiaIndex = sorted.findIndex((v) => v.countryiso3code === 'IND');
      const rows: RankedRow[] = [];

      if (indiaIndex >= 0) {
        const india = sorted[indiaIndex]!;
        rows.push({
          angle: 'india',
          iso3: 'IND',
          value: india.value!,
          rank: indiaIndex + 1,
          total: sorted.length,
          year: Number(india.date),
          indicator,
          leaderIso3: leader.countryiso3code,
          leaderValue: leader.value!,
        });
      }

      rows.push({
        angle: 'leader',
        iso3: leader.countryiso3code,
        value: leader.value!,
        rank: 1,
        total: sorted.length,
        year: Number(leader.date),
        indicator,
      });

      return { rows };
    },

    map(row: unknown, task: Task): FactDraft[] {
      const template = byId.get(task.templateId ?? '');
      if (!template) return [];
      const r = row as RankedRow;
      // Each template declares which angle it renders, so one indicator can feed
      // an "India ranks" card and a "world leader" card with separate phrasing.
      if (r.angle !== (template.params?.angle ?? 'india')) return [];

      const index = indexRef;
      if (!index) return [];
      const self = index.get(r.iso3);
      if (!self) return [];

      const bound: Row = {
        country: countryBinding(self),
        value: { number: r.value },
        rank: { number: r.rank },
        total: { number: r.total },
        year: { number: r.year },
        source: { en: `https://data.worldbank.org/indicator/${r.indicator}?locations=${r.iso3}` },
      };

      if (r.leaderIso3) {
        const leader = index.get(r.leaderIso3);
        if (leader) {
          bound.leader = countryBinding(leader);
          bound.leaderValue = { number: r.leaderValue ?? 0 };
        }
      }

      const draft = draftFromRow(template, bound, {
        ...(task.subtopicSlug ? { subtopicSlug: task.subtopicSlug } : {}),
        ...(task.categoryId ? { categoryId: task.categoryId } : {}),
      });
      return draft ? [draft] : [];
    },
  };
}

/**
 * `map()` is synchronous by contract, so the country index has to be warm before
 * a run starts. The pipeline calls this once during setup.
 */
let indexRef: Awaited<ReturnType<typeof countryIndex>> | null = null;

export async function warmCountryIndex(): Promise<number> {
  indexRef = await countryIndex();
  return indexRef.size;
}

export { countryIndex, resetCountryIndex } from './countries';
