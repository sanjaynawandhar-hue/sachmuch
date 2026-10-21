ALTER TABLE "fact_evidence" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "canonical_claim_key" varchar(64);--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "canonical_claim" jsonb;--> statement-breakpoint
ALTER TABLE "facts" ADD COLUMN "corpus_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "facts_claim_key_uq" ON "facts" USING btree ("canonical_claim_key");