CREATE TABLE "corpus_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"source_version" text,
	"cursor" text,
	"pending_page" jsonb,
	"processing_index" integer DEFAULT 0 NOT NULL,
	"complete" boolean DEFAULT false NOT NULL,
	"retry_after" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corpus_batch_index_nonnegative" CHECK ("corpus_batches"."processing_index" >= 0)
);
--> statement-breakpoint
ALTER TABLE "corpus_batches" ADD CONSTRAINT "corpus_batches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;