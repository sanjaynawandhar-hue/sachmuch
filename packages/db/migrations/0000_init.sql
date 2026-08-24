CREATE TYPE "public"."connector_kind" AS ENUM('sparql', 'rest', 'dump', 'rss');--> statement-breakpoint
CREATE TYPE "public"."fact_status" AS ENUM('draft', 'rejected', 'live', 'hidden', 'stale');--> statement-breakpoint
CREATE TYPE "public"."interaction_kind" AS ENUM('seen', 'completed', 'like', 'unlike', 'save', 'unsave', 'share', 'skip', 'report', 'listen');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."lang_code" AS ENUM('en', 'hi');--> statement-breakpoint
CREATE TYPE "public"."licence_kind" AS ENUM('cc0', 'cc_by', 'cc_by_sa', 'public_domain', 'terms_only');--> statement-breakpoint
CREATE TYPE "public"."review_verdict" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."source_health" AS ENUM('healthy', 'degraded', 'disabled');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" smallint PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"position" smallint NOT NULL,
	"tint_bg" varchar(9) NOT NULL,
	"tint_surface" varchar(9) NOT NULL,
	"tint_accent" varchar(9) NOT NULL,
	"tint_dark_bg" varchar(9) NOT NULL,
	"tint_dark_surface" varchar(9) NOT NULL,
	"tint_dark_accent" varchar(9) NOT NULL,
	"emoji" varchar(8) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"kids_safe" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"text" text NOT NULL,
	"lang" "lang_code" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coin_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" varchar(48) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"ist_day" varchar(10) NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"collection_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_collection_id_fact_id_pk" PRIMARY KEY("collection_id","fact_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(96) NOT NULL,
	"slug" varchar(96) NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "daily_cache" (
	"key" varchar(96) NOT NULL,
	"ist_date" varchar(10) NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_cache_key_ist_date_pk" PRIMARY KEY("key","ist_date")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"qid" varchar(24) PRIMARY KEY NOT NULL,
	"label_en" text NOT NULL,
	"label_hi" text,
	"description_en" text,
	"description_hi" text,
	"image_url" text,
	"kind" varchar(32) DEFAULT 'other' NOT NULL,
	"gender" varchar(16),
	"fact_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"user_id" uuid NOT NULL,
	"key" varchar(48) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" varchar(32) DEFAULT 'system' NOT NULL,
	CONSTRAINT "entitlements_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "fact_entities" (
	"fact_id" uuid NOT NULL,
	"qid" varchar(24) NOT NULL,
	"role" varchar(16) DEFAULT 'subject' NOT NULL,
	CONSTRAINT "fact_entities_fact_id_qid_pk" PRIMARY KEY("fact_id","qid")
);
--> statement-breakpoint
CREATE TABLE "fact_of_day" (
	"ist_date" varchar(10) PRIMARY KEY NOT NULL,
	"fact_id" uuid NOT NULL,
	"chosen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fact_sources" (
	"fact_id" uuid NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"url" text NOT NULL,
	"licence" "licence_kind" NOT NULL,
	"publisher" text NOT NULL,
	"checked_at" timestamp with time zone,
	CONSTRAINT "fact_sources_fact_id_source_id_url_pk" PRIMARY KEY("fact_id","source_id","url")
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" smallint NOT NULL,
	"subtopic_id" integer,
	"template_id" varchar(96),
	"source_id" varchar(64) NOT NULL,
	"hook_en" text NOT NULL,
	"body_en" text NOT NULL,
	"hook_hi" text,
	"body_hi" text,
	"hi_missing" boolean DEFAULT true NOT NULL,
	"source_url" text NOT NULL,
	"publisher" text NOT NULL,
	"licence" "licence_kind" NOT NULL,
	"attribution_text" text,
	"source_checked_at" timestamp with time zone,
	"status" "fact_status" DEFAULT 'draft' NOT NULL,
	"reject_reason" text,
	"difficulty" smallint DEFAULT 3 NOT NULL,
	"quality" real DEFAULT 0.5 NOT NULL,
	"corroboration_count" smallint DEFAULT 1 NOT NULL,
	"valid_until" timestamp with time zone,
	"normalized_hash" varchar(64) NOT NULL,
	"search_en" "tsvector",
	"search_hi" "tsvector",
	"like_count" integer DEFAULT 0 NOT NULL,
	"seen_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"report_count" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"live_at" timestamp with time zone,
	CONSTRAINT "facts_live_needs_source" CHECK ("facts"."status" <> 'live' OR ("facts"."source_url" ~ '^https?://' AND length(btrim("facts"."publisher")) > 0)),
	CONSTRAINT "facts_hindi_complete_or_flagged" CHECK ("facts"."hi_missing" OR ("facts"."hook_hi" IS NOT NULL AND length(btrim("facts"."hook_hi")) > 0
           AND "facts"."body_hi" IS NOT NULL AND length(btrim("facts"."body_hi")) > 0)),
	CONSTRAINT "facts_difficulty_range" CHECK ("facts"."difficulty" BETWEEN 1 AND 5),
	CONSTRAINT "facts_quality_range" CHECK ("facts"."quality" BETWEEN 0 AND 1),
	CONSTRAINT "facts_hook_length" CHECK (length("facts"."hook_en") <= 150)
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"kind" "interaction_kind" NOT NULL,
	"dwell_ms" integer,
	"lang" "lang_code" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"task" jsonb NOT NULL,
	"cursor" text,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(64),
	"rows_written" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offline_packs" (
	"user_id" uuid NOT NULL,
	"category_id" smallint NOT NULL,
	"lang" "lang_code" NOT NULL,
	"fact_count" integer NOT NULL,
	"built_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offline_packs_user_id_category_id_lang_pk" PRIMARY KEY("user_id","category_id","lang")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device_id" varchar(64),
	"handle" varchar(32),
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"merged_from" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "quiz_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ist_day" varchar(10) NOT NULL,
	"lang" "lang_code" NOT NULL,
	"questions" jsonb NOT NULL,
	"answers" jsonb,
	"correct_count" smallint,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_id" uuid NOT NULL,
	"user_id" uuid,
	"reason" varchar(32) NOT NULL,
	"detail" text,
	"verdict" "review_verdict" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_one_per_user_uq" UNIQUE("fact_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"fact_id" uuid PRIMARY KEY NOT NULL,
	"template_id" varchar(96),
	"verdict" "review_verdict" DEFAULT 'pending' NOT NULL,
	"note" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seen_facts" (
	"user_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	CONSTRAINT "seen_facts_user_id_fact_id_pk" PRIMARY KEY("user_id","fact_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"homepage" text NOT NULL,
	"kind" "connector_kind" NOT NULL,
	"licence" "licence_kind" NOT NULL,
	"attribution_required" boolean NOT NULL,
	"attribution_text" text,
	"rate_limit_rpm" integer NOT NULL,
	"needs_key" boolean DEFAULT false NOT NULL,
	"schedule" varchar(64) NOT NULL,
	"health" "source_health" DEFAULT 'healthy' NOT NULL,
	"consecutive_failures" smallint DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_ok_at" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"notes" text,
	CONSTRAINT "sources_attribution_present" CHECK (NOT "sources"."attribution_required" OR "sources"."attribution_text" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "srs_items" (
	"user_id" uuid NOT NULL,
	"fact_id" uuid NOT NULL,
	"ease" real DEFAULT 2.5 NOT NULL,
	"interval_days" real DEFAULT 0 NOT NULL,
	"repetitions" smallint DEFAULT 0 NOT NULL,
	"lapses" smallint DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	CONSTRAINT "srs_items_user_id_fact_id_pk" PRIMARY KEY("user_id","fact_id")
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"longest" integer DEFAULT 0 NOT NULL,
	"last_day_ist" varchar(10),
	"freezes_owned" smallint DEFAULT 0 NOT NULL,
	"freeze_used_on_ist" varchar(10),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtopics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subtopics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" smallint NOT NULL,
	"slug" varchar(96) NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text NOT NULL,
	"hints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"live_fact_count" integer DEFAULT 0 NOT NULL,
	"last_ingested_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar(96) PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"category_id" smallint NOT NULL,
	"decays" boolean DEFAULT false NOT NULL,
	"pattern_count" smallint NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_reason" text,
	"drafts_produced" integer DEFAULT 0 NOT NULL,
	"live_produced" integer DEFAULT 0 NOT NULL,
	"hi_missing_count" integer DEFAULT 0 NOT NULL,
	"sampled_count" integer DEFAULT 0 NOT NULL,
	"sample_rejected_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"category_id" smallint NOT NULL,
	"score" real DEFAULT 0.5 NOT NULL,
	"declared" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interests_user_id_category_id_pk" PRIMARY KEY("user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "user_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"lang" "lang_code" DEFAULT 'en' NOT NULL,
	"scheme" varchar(8) DEFAULT 'system' NOT NULL,
	"type_scale" varchar(8) DEFAULT 'default' NOT NULL,
	"font_choice" varchar(24) DEFAULT 'default' NOT NULL,
	"high_legibility" boolean DEFAULT false NOT NULL,
	"data_saver" boolean DEFAULT false NOT NULL,
	"kids_mode" boolean DEFAULT false NOT NULL,
	"max_difficulty" smallint DEFAULT 5 NOT NULL,
	"tts_rate" real DEFAULT 1 NOT NULL,
	"reduce_motion" boolean DEFAULT false NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"notify_hour_ist" smallint DEFAULT 9 NOT NULL,
	"onboarded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "category_requests" ADD CONSTRAINT "category_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_ledger" ADD CONSTRAINT "coin_ledger_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_entities" ADD CONSTRAINT "fact_entities_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_entities" ADD CONSTRAINT "fact_entities_qid_entities_qid_fk" FOREIGN KEY ("qid") REFERENCES "public"."entities"("qid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_of_day" ADD CONSTRAINT "fact_of_day_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD CONSTRAINT "fact_sources_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_sources" ADD CONSTRAINT "fact_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_packs" ADD CONSTRAINT "offline_packs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_packs" ADD CONSTRAINT "offline_packs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seen_facts" ADD CONSTRAINT "seen_facts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seen_facts" ADD CONSTRAINT "seen_facts_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_items" ADD CONSTRAINT "srs_items_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_items" ADD CONSTRAINT "srs_items_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_position_uq" ON "categories" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_ledger_idem_uq" ON "coin_ledger" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "coin_ledger_day_idx" ON "coin_ledger" USING btree ("user_id","ist_day");--> statement-breakpoint
CREATE INDEX "collections_user_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entities_kind_idx" ON "entities" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "entities_factcount_idx" ON "entities" USING btree ("fact_count");--> statement-breakpoint
CREATE INDEX "fact_entities_qid_idx" ON "fact_entities" USING btree ("qid","role");--> statement-breakpoint
CREATE UNIQUE INDEX "facts_hash_uq" ON "facts" USING btree ("normalized_hash");--> statement-breakpoint
CREATE INDEX "facts_feed_idx" ON "facts" USING btree ("status","category_id","quality");--> statement-breakpoint
CREATE INDEX "facts_hindi_feed_idx" ON "facts" USING btree ("category_id","quality") WHERE "facts"."status" = 'live' AND NOT "facts"."hi_missing";--> statement-breakpoint
CREATE INDEX "facts_subtopic_idx" ON "facts" USING btree ("subtopic_id","status");--> statement-breakpoint
CREATE INDEX "facts_template_idx" ON "facts" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "facts_decay_idx" ON "facts" USING btree ("valid_until") WHERE "facts"."valid_until" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "interactions_user_kind_idx" ON "interactions" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "interactions_fact_idx" ON "interactions" USING btree ("fact_id","kind");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","run_after","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_uq" ON "jobs" USING btree ("source_id","task") WHERE "jobs"."status" IN ('queued','running');--> statement-breakpoint
CREATE INDEX "profiles_device_idx" ON "profiles" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_day_uq" ON "quiz_sessions" USING btree ("user_id","ist_day");--> statement-breakpoint
CREATE INDEX "reports_pending_idx" ON "reports" USING btree ("verdict","created_at");--> statement-breakpoint
CREATE INDEX "review_queue_pending_idx" ON "review_queue" USING btree ("verdict","queued_at");--> statement-breakpoint
CREATE INDEX "seen_skipped_idx" ON "seen_facts" USING btree ("user_id","skipped","seen_at");--> statement-breakpoint
CREATE INDEX "srs_due_idx" ON "srs_items" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subtopics_cat_slug_uq" ON "subtopics" USING btree ("category_id","slug");--> statement-breakpoint
CREATE INDEX "subtopics_thinness_idx" ON "subtopics" USING btree ("category_id","live_fact_count");--> statement-breakpoint
CREATE INDEX "templates_enabled_idx" ON "templates" USING btree ("enabled","category_id");