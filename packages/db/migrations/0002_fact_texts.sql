ALTER TYPE "public"."interaction_kind" ADD VALUE IF NOT EXISTS 'boost';--> statement-breakpoint
CREATE TABLE "fact_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"publisher" text NOT NULL,
	"licence" "licence_kind" NOT NULL,
	"checked_at" timestamp with time zone,
	"source_record_key" text NOT NULL,
	CONSTRAINT "fact_evidence_source" CHECK ("fact_evidence"."source_url" ~ '^https?://' AND length(btrim("fact_evidence"."publisher")) > 0)
);
--> statement-breakpoint
CREATE TABLE "fact_texts" (
	"fact_id" uuid NOT NULL,
	"language" "lang_code" NOT NULL,
	"hook" text NOT NULL,
	"body" text NOT NULL,
	"review_state" "review_verdict" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "fact_texts_fact_id_language_pk" PRIMARY KEY("fact_id","language"),
	CONSTRAINT "fact_texts_complete" CHECK (length(btrim("fact_texts"."hook")) > 0 AND length(btrim("fact_texts"."body")) > 0)
);
--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "image_licence" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "image_credit" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN IF NOT EXISTS "enriched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "original_language" "lang_code" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "knowledge_kind" varchar(16) DEFAULT 'fact' NOT NULL;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "as_of" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "batch_id" varchar(96);--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN IF NOT EXISTS "boost_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_texts" ADD CONSTRAINT "fact_texts_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fact_evidence_identity" ON "fact_evidence" USING btree ("fact_id","source_url","source_record_key");--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_knowledge_kind" CHECK ("facts"."knowledge_kind" IN ('fact', 'belief', 'folklore'));