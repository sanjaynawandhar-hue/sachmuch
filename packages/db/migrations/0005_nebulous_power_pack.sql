CREATE TABLE "feed_entries" (
	"snapshot_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"fact_id" uuid NOT NULL,
	CONSTRAINT "feed_entries_snapshot_id_position_pk" PRIMARY KEY("snapshot_id","position")
);
--> statement-breakpoint
CREATE TABLE "feed_snapshots" (
	"id" uuid PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_eligible" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_entries" ADD CONSTRAINT "feed_entries_snapshot_id_feed_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."feed_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_entries" ADD CONSTRAINT "feed_entries_fact_id_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."facts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feed_snapshot_fact" ON "feed_entries" USING btree ("snapshot_id","fact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_feed_snapshot" ON "feed_snapshots" USING btree ("active") WHERE "feed_snapshots"."active"=true;