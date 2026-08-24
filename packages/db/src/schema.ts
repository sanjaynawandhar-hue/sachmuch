/**
 * Sachmuch database schema (Supabase Postgres, Drizzle).
 *
 * Two non-negotiables are enforced here rather than in application code, because
 * application code gets bypassed by a pipeline run at 3am:
 *   - a live fact must carry a resolvable source URL and a named publisher
 *   - a fact without Hindi can never be served to the Hindi feed
 *
 * No pgvector: dedupe is trigram similarity plus a normalised hash, which is
 * sufficient for template-generated text and needs no model.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** Postgres full-text search vector; maintained by a trigger, not by the app. */
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

/* ────────────────────────────── enums ────────────────────────────── */

export const factStatus = pgEnum('fact_status', [
  'draft',      // rendered, not yet through the quality gate
  'rejected',   // failed the gate; kept so we can measure template health
  'live',       // servable
  'hidden',     // auto-hidden by reports, or pulled by an admin
  'stale',      // decaying fact past its valid_until
]);

export const licenceKind = pgEnum('licence_kind', [
  'cc0',
  'cc_by',
  'cc_by_sa',
  'public_domain',
  'terms_only',
]);

export const connectorKind = pgEnum('connector_kind', ['sparql', 'rest', 'dump', 'rss']);

export const sourceHealth = pgEnum('source_health', ['healthy', 'degraded', 'disabled']);

export const jobStatus = pgEnum('job_status', [
  'queued',
  'running',
  'done',
  'failed',
  'paused',       // rate limited; this source only
]);

export const langCode = pgEnum('lang_code', ['en', 'hi']);

export const interactionKind = pgEnum('interaction_kind', [
  'seen',
  'completed',   // expanded, or >=4s dwell with the body visible
  'like',
  'unlike',
  'save',
  'unsave',
  'share',
  'skip',
  'report',
  'listen',
  'boost',
]);

export const reviewVerdict = pgEnum('review_verdict', ['pending', 'accepted', 'rejected']);

/* ──────────────────────────── taxonomy ──────────────────────────── */

export const categories = pgTable(
  'categories',
  {
    id: smallint('id').primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    nameEn: text('name_en').notNull(),
    nameHi: text('name_hi').notNull(),
    /** Position drives the deterministic tint rotation; changing it re-tints. */
    position: smallint('position').notNull(),
    tintBg: varchar('tint_bg', { length: 9 }).notNull(),
    tintSurface: varchar('tint_surface', { length: 9 }).notNull(),
    tintAccent: varchar('tint_accent', { length: 9 }).notNull(),
    tintDarkBg: varchar('tint_dark_bg', { length: 9 }).notNull(),
    tintDarkSurface: varchar('tint_dark_surface', { length: 9 }).notNull(),
    tintDarkAccent: varchar('tint_dark_accent', { length: 9 }).notNull(),
    emoji: varchar('emoji', { length: 8 }).notNull(),
    /** Hidden from the picker but still ingestible. */
    enabled: boolean('enabled').notNull().default(true),
    /** Kids mode excludes categories that are mostly grim history. */
    kidsSafe: boolean('kids_safe').notNull().default(true),
  },
  (t) => [uniqueIndex('categories_position_uq').on(t.position)],
);

export const subtopics = pgTable(
  'subtopics',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    categoryId: smallint('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 96 }).notNull(),
    nameEn: text('name_en').notNull(),
    nameHi: text('name_hi').notNull(),
    /** Free-text hints the connectors use to target queries (QIDs, keywords). */
    hints: jsonb('hints').$type<{ qids?: string[]; keywords?: string[] }>().notNull().default({}),
    /** Maintained by the pipeline; drives the never-empty top-up in §9. */
    liveFactCount: integer('live_fact_count').notNull().default(0),
    lastIngestedAt: timestamp('last_ingested_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('subtopics_cat_slug_uq').on(t.categoryId, t.slug),
    index('subtopics_thinness_idx').on(t.categoryId, t.liveFactCount),
  ],
);

/* ──────────────────────────── sources ───────────────────────────── */

export const sources = pgTable('sources', {
  id: varchar('id', { length: 64 }).primaryKey(), // matches Connector.id
  name: text('name').notNull(),
  publisher: text('publisher').notNull(),
  homepage: text('homepage').notNull(),
  kind: connectorKind('kind').notNull(),
  licence: licenceKind('licence').notNull(),
  attributionRequired: boolean('attribution_required').notNull(),
  attributionText: text('attribution_text'),
  rateLimitRpm: integer('rate_limit_rpm').notNull(),
  needsKey: boolean('needs_key').notNull().default(false),
  schedule: varchar('schedule', { length: 64 }).notNull(),
  health: sourceHealth('health').notNull().default('healthy'),
  consecutiveFailures: smallint('consecutive_failures').notNull().default(0),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastOkAt: timestamp('last_ok_at', { withTimezone: true }),
  enabled: boolean('enabled').notNull().default(true),
  notes: text('notes'),
}, (t) => [
  check(
    'sources_attribution_present',
    sql`NOT ${t.attributionRequired} OR ${t.attributionText} IS NOT NULL`,
  ),
]);

/* ─────────────────────────── templates ──────────────────────────── */

export const templates = pgTable(
  'templates',
  {
    id: varchar('id', { length: 96 }).primaryKey(),
    sourceId: varchar('source_id', { length: 64 })
      .notNull()
      .references(() => sources.id),
    categoryId: smallint('category_id')
      .notNull()
      .references(() => categories.id),
    /** Superlatives and current-holders must expire; see §6. */
    decays: boolean('decays').notNull().default(false),
    patternCount: smallint('pattern_count').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    disabledReason: text('disabled_reason'),
    /* yield tracking — this is what tells me which templates are worth writing more of */
    draftsProduced: integer('drafts_produced').notNull().default(0),
    liveProduced: integer('live_produced').notNull().default(0),
    hiMissingCount: integer('hi_missing_count').notNull().default(0),
    sampledCount: integer('sampled_count').notNull().default(0),
    sampleRejectedCount: integer('sample_rejected_count').notNull().default(0),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  },
  (t) => [index('templates_enabled_idx').on(t.enabled, t.categoryId)],
);

/* ───────────────────────────── entities ─────────────────────────── */

/** Wikidata entities. The QID is what makes the fact graph in §8 possible. */
export const entities = pgTable(
  'entities',
  {
    qid: varchar('qid', { length: 24 }).primaryKey(),
    labelEn: text('label_en').notNull(),
    labelHi: text('label_hi'),
    descriptionEn: text('description_en'),
    descriptionHi: text('description_hi'),
    /** Wikidata P18 image, served through Wikimedia; null under data saver. */
    imageUrl: text('image_url'),
    /**
     * Commons images are individually licensed — CC0, CC BY, CC BY-SA, PD — and
     * the ones that require credit require it visibly. Storing the licence and
     * the author alongside the URL is what makes the obligation enforceable
     * rather than something the card layer has to remember.
     */
    imageLicence: text('image_licence'),
    imageCredit: text('image_credit'),
    /** True when the entity was checked and genuinely has no image, so we stop asking. */
    enrichedAt: timestamp('enriched_at', { withTimezone: true }),
    /** 'human' | 'film' | 'place' | 'organisation' | 'work' | 'other' */
    kind: varchar('kind', { length: 32 }).notNull().default('other'),
    /** P21, needed for Hindi verb agreement. */
    gender: varchar('gender', { length: 16 }),
    factCount: integer('fact_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('entities_kind_idx').on(t.kind), index('entities_factcount_idx').on(t.factCount)],
);

/* ────────────────────────────── facts ───────────────────────────── */

export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: smallint('category_id')
      .notNull()
      .references(() => categories.id),
    subtopicId: integer('subtopic_id').references(() => subtopics.id),
    templateId: varchar('template_id', { length: 96 }).references(() => templates.id),
    sourceId: varchar('source_id', { length: 64 })
      .notNull()
      .references(() => sources.id),

    hookEn: text('hook_en').notNull(),
    bodyEn: text('body_en').notNull(),
    hookHi: text('hook_hi'),
    bodyHi: text('body_hi'),
    /** Set when a row arrived without a Hindi label, or from an English-only source. */
    hiMissing: boolean('hi_missing').notNull().default(true),

    /** Provenance. A live fact cannot exist without these — see the check below. */
    sourceUrl: text('source_url').notNull(),
    publisher: text('publisher').notNull(),
    licence: licenceKind('licence').notNull(),
    /** Rendered on the card only when the licence obliges it. */
    attributionText: text('attribution_text'),
    sourceCheckedAt: timestamp('source_checked_at', { withTimezone: true }),

    status: factStatus('status').notNull().default('draft'),
    rejectReason: text('reject_reason'),

    /** 1 (kids) … 5 (obscure). Kids mode serves 1–2 only. */
    difficulty: smallint('difficulty').notNull().default(3),
    /** Gate output, 0–1; feed ranking multiplies by this. */
    quality: real('quality').notNull().default(0.5),
    /** Independent sources asserting the same claim. 2+ shows the badge. */
    corroborationCount: smallint('corroboration_count').notNull().default(1),

    /** Superlatives get an expiry so the app does not look stupid in 18 months. */
    validUntil: timestamp('valid_until', { withTimezone: true }),

    /** Dedupe: exact match on the normalised hash, then pg_trgm within a category. */
    normalizedHash: varchar('normalized_hash', { length: 64 }).notNull(),
    searchEn: tsvector('search_en'),
    searchHi: tsvector('search_hi'),

    likeCount: integer('like_count').notNull().default(0),
    seenCount: integer('seen_count').notNull().default(0),
    shareCount: integer('share_count').notNull().default(0),
    /**
     * Boosts. A reader saying "more people should see this", recorded in the app
     * rather than posted anywhere. It is a better ranking signal than a like:
     * a like says "I enjoyed this", a boost says "this deserves an audience",
     * and only the second is a judgement about the fact rather than the reader.
     */
    boostCount: integer('boost_count').notNull().default(0),
    reportCount: smallint('report_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    liveAt: timestamp('live_at', { withTimezone: true }),
  },
  (t) => [
    /* §2.4 — every live fact has a resolvable source URL and a publisher. */
    check(
      'facts_live_needs_source',
      sql`${t.status} <> 'live' OR (${t.sourceUrl} ~ '^https?://' AND length(btrim(${t.publisher})) > 0)`,
    ),
    /* §2.5 — Hindi is first-class: it is present in full, or the fact is flagged. */
    check(
      'facts_hindi_complete_or_flagged',
      sql`${t.hiMissing} OR (${t.hookHi} IS NOT NULL AND length(btrim(${t.hookHi})) > 0
           AND ${t.bodyHi} IS NOT NULL AND length(btrim(${t.bodyHi})) > 0)`,
    ),
    check('facts_difficulty_range', sql`${t.difficulty} BETWEEN 1 AND 5`),
    check('facts_quality_range', sql`${t.quality} BETWEEN 0 AND 1`),
    check('facts_hook_length', sql`length(${t.hookEn}) <= 150`),
    uniqueIndex('facts_hash_uq').on(t.normalizedHash),
    index('facts_feed_idx').on(t.status, t.categoryId, t.quality),
    /* The Hindi feed reads through this partial index and structurally cannot see hi_missing rows. */
    index('facts_hindi_feed_idx').on(t.categoryId, t.quality).where(sql`${t.status} = 'live' AND NOT ${t.hiMissing}`),
    index('facts_subtopic_idx').on(t.subtopicId, t.status),
    index('facts_template_idx').on(t.templateId),
    index('facts_decay_idx').on(t.validUntil).where(sql`${t.validUntil} IS NOT NULL`),
  ],
);

/** Extra sources for the same claim. Row count + 1 drives the "2 sources" badge. */
export const factSources = pgTable(
  'fact_sources',
  {
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    sourceId: varchar('source_id', { length: 64 })
      .notNull()
      .references(() => sources.id),
    url: text('url').notNull(),
    licence: licenceKind('licence').notNull(),
    publisher: text('publisher').notNull(),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.factId, t.sourceId, t.url] })],
);

/** The fact graph: which entities a fact is about. */
export const factEntities = pgTable(
  'fact_entities',
  {
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    qid: varchar('qid', { length: 24 })
      .notNull()
      .references(() => entities.qid, { onDelete: 'cascade' }),
    /** 'subject' entities get a chip on the card; 'mentioned' ones do not. */
    role: varchar('role', { length: 16 }).notNull().default('subject'),
  },
  (t) => [
    primaryKey({ columns: [t.factId, t.qid] }),
    index('fact_entities_qid_idx').on(t.qid, t.role),
  ],
);

/* ────────────────────────────── jobs ────────────────────────────── */

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: varchar('source_id', { length: 64 })
      .notNull()
      .references(() => sources.id),
    /** The Task the connector's discover() produced. */
    task: jsonb('task').$type<Record<string, unknown>>().notNull(),
    /** Persisted so a run can resume mid-page. */
    cursor: text('cursor'),
    status: jobStatus('status').notNull().default('queued'),
    priority: smallint('priority').notNull().default(0),
    attempts: smallint('attempts').notNull().default(0),
    lastError: text('last_error'),
    runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lockedBy: varchar('locked_by', { length: 64 }),
    rowsWritten: integer('rows_written').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => [
    index('jobs_claim_idx').on(t.status, t.runAfter, t.priority),
    uniqueIndex('jobs_dedupe_uq').on(t.sourceId, t.task).where(sql`${t.status} IN ('queued','running')`),
  ],
);

/** Live tier: today's On This Day, number of the day. Cached per IST date. */
export const dailyCache = pgTable(
  'daily_cache',
  {
    key: varchar('key', { length: 96 }).notNull(),
    istDate: varchar('ist_date', { length: 10 }).notNull(),
    payload: jsonb('payload').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.key, t.istDate] })],
);

/** Server-chosen, same for everyone on a given IST day. */
export const factOfDay = pgTable('fact_of_day', {
  istDate: varchar('ist_date', { length: 10 }).primaryKey(),
  factId: uuid('fact_id')
    .notNull()
    .references(() => facts.id),
  chosenAt: timestamp('chosen_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────────── users ───────────────────────────── */

/**
 * Mirrors Supabase `auth.users`. Anonymous sessions get a row too, bound to a
 * device id, and merge on sign-up.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    deviceId: varchar('device_id', { length: 64 }),
    handle: varchar('handle', { length: 32 }).unique(),
    isAnonymous: boolean('is_anonymous').notNull().default(true),
    /** Set once at sign-up so a merged anonymous history is traceable. */
    mergedFrom: uuid('merged_from'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('profiles_device_idx').on(t.deviceId)],
);

export const userPrefs = pgTable('user_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  lang: langCode('lang').notNull().default('en'),
  scheme: varchar('scheme', { length: 8 }).notNull().default('system'),
  typeScale: varchar('type_scale', { length: 8 }).notNull().default('default'),
  fontChoice: varchar('font_choice', { length: 24 }).notNull().default('default'),
  highLegibility: boolean('high_legibility').notNull().default(false),
  dataSaver: boolean('data_saver').notNull().default(false),
  kidsMode: boolean('kids_mode').notNull().default(false),
  maxDifficulty: smallint('max_difficulty').notNull().default(5),
  ttsRate: real('tts_rate').notNull().default(1),
  reduceMotion: boolean('reduce_motion').notNull().default(false),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  notifyHourIst: smallint('notify_hour_ist').notNull().default(9),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
});

/** Declared at onboarding, then continuously revised by behaviour. */
export const userInterests = pgTable(
  'user_interests',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    categoryId: smallint('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    /** 0–1. Seeded from the onboarding picker, then moved by engagement. */
    score: real('score').notNull().default(0.5),
    declared: boolean('declared').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categoryId] })],
);

export const interactions = pgTable(
  'interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    kind: interactionKind('kind').notNull(),
    dwellMs: integer('dwell_ms'),
    lang: langCode('lang').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('interactions_user_kind_idx').on(t.userId, t.kind, t.createdAt),
    index('interactions_fact_idx').on(t.factId, t.kind),
  ],
);

/**
 * Denormalised seen-set. Kept apart from `interactions` because the feed reads
 * it on every page and an append-only event log is the wrong shape for that.
 */
export const seenFacts = pgTable(
  'seen_facts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
    completed: boolean('completed').notNull().default(false),
    skipped: boolean('skipped').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.factId] }),
    /* The last-resort fallback in §9 reads least-recently-seen skipped facts. */
    index('seen_skipped_idx').on(t.userId, t.skipped, t.seenAt),
  ],
);

/* ──────────────────────── coins and streaks ─────────────────────── */

/**
 * Append-only. The balance is the sum; the client never computes it.
 * `istDay` is stamped from the SERVER clock — device time is the first thing
 * anyone will try to cheat.
 */
export const coinLedger = pgTable(
  'coin_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: varchar('reason', { length: 48 }).notNull(),
    /** Every write carries one; this unique index is what makes it idempotent. */
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    istDay: varchar('ist_day', { length: 10 }).notNull(),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('coin_ledger_idem_uq').on(t.userId, t.idempotencyKey),
    index('coin_ledger_day_idx').on(t.userId, t.istDay),
  ],
);

export const streaks = pgTable('streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  current: integer('current').notNull().default(0),
  longest: integer('longest').notNull().default(0),
  /** IST calendar day, server clock. */
  lastDayIst: varchar('last_day_ist', { length: 10 }),
  freezesOwned: smallint('freezes_owned').notNull().default(0),
  freezeUsedOnIst: varchar('freeze_used_on_ist', { length: 10 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * §11 — the premium boundary. Every gated feature routes through
 * hasEntitlement(). Today that returns true for everything and this table sits
 * empty; when premium ships it is one function plus a billing integration.
 */
export const entitlements = pgTable(
  'entitlements',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 48 }).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    grantedBy: varchar('granted_by', { length: 32 }).notNull().default('system'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

/* ─────────────────── spaced repetition and quiz ─────────────────── */

/** SM-2. Facts you liked resurface on a schedule; nobody else implements this. */
export const srsItems = pgTable(
  'srs_items',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    ease: real('ease').notNull().default(2.5),
    intervalDays: real('interval_days').notNull().default(0),
    repetitions: smallint('repetitions').notNull().default(0),
    lapses: smallint('lapses').notNull().default(0),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.factId] }),
    index('srs_due_idx').on(t.userId, t.dueAt),
  ],
);

/** Built from facts this user personally has seen. */
export const quizSessions = pgTable(
  'quiz_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    istDay: varchar('ist_day', { length: 10 }).notNull(),
    lang: langCode('lang').notNull(),
    questions: jsonb('questions').$type<unknown[]>().notNull(),
    answers: jsonb('answers').$type<unknown[]>(),
    correctCount: smallint('correct_count'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('quiz_day_uq').on(t.userId, t.istDay)],
);

/* ───────────────────── collections and reports ──────────────────── */

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 96 }).notNull(),
    slug: varchar('slug', { length: 96 }).notNull().unique(),
    isPublic: boolean('is_public').notNull().default(false),
    /** The default "Saved" collection every user gets. */
    isDefault: boolean('is_default').notNull().default(false),
    itemCount: integer('item_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('collections_user_idx').on(t.userId)],
);

export const collectionItems = pgTable(
  'collection_items',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.factId] })],
);

/** Three reports auto-hide a fact pending review. */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    factId: uuid('fact_id')
      .notNull()
      .references(() => facts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    reason: varchar('reason', { length: 32 }).notNull(),
    detail: text('detail'),
    verdict: reviewVerdict('verdict').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('reports_one_per_user_uq').on(t.factId, t.userId),
    index('reports_pending_idx').on(t.verdict, t.createdAt),
  ],
);

/** §7.6 — 1% sample of newly-live facts. >5% rejection auto-disables a template. */
export const reviewQueue = pgTable(
  'review_queue',
  {
    factId: uuid('fact_id')
      .primaryKey()
      .references(() => facts.id, { onDelete: 'cascade' }),
    templateId: varchar('template_id', { length: 96 }).references(() => templates.id),
    verdict: reviewVerdict('verdict').notNull().default('pending'),
    note: text('note'),
    queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => [index('review_queue_pending_idx').on(t.verdict, t.queuedAt)],
);

/** Feeds my template backlog. */
export const categoryRequests = pgTable('category_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  text: text('text').notNull(),
  lang: langCode('lang').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Offline packs: which pack a device has, so we can ship deltas not dumps. */
export const offlinePacks = pgTable(
  'offline_packs',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    categoryId: smallint('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    lang: langCode('lang').notNull(),
    factCount: integer('fact_count').notNull(),
    builtAt: timestamp('built_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.categoryId, t.lang] })],
);
