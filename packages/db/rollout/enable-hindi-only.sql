-- MANUAL ROLLOUT GATE: production backup, additive migration + backfill,
-- compatible legacy readers deployed, v2 readers validated. Not auto-migrated.
ALTER TABLE facts ALTER COLUMN hook_en DROP NOT NULL;
ALTER TABLE facts ALTER COLUMN body_en DROP NOT NULL;
ALTER TABLE facts ADD CONSTRAINT facts_original_complete CHECK (
 (original_language='en' AND coalesce(length(btrim(hook_en))>0 AND length(btrim(body_en))>0,false)) OR
 (original_language='hi' AND coalesce(length(btrim(hook_hi))>0 AND length(btrim(body_hi))>0,false))
);

-- Keep the old trusted ingestion writer compatible during the transition.
CREATE OR REPLACE FUNCTION sync_legacy_fact_texts() RETURNS trigger AS $$
BEGIN
 IF length(btrim(NEW.hook_en))>0 AND length(btrim(NEW.body_en))>0 THEN
  INSERT INTO fact_texts(fact_id,language,hook,body,review_state)
   VALUES(NEW.id,'en',NEW.hook_en,NEW.body_en,CASE WHEN NEW.status='live' THEN 'accepted'::review_verdict ELSE 'pending'::review_verdict END)
   ON CONFLICT(fact_id,language) DO UPDATE SET hook=excluded.hook,body=excluded.body,review_state=excluded.review_state;
 END IF;
 IF length(btrim(NEW.hook_hi))>0 AND length(btrim(NEW.body_hi))>0 THEN
  INSERT INTO fact_texts(fact_id,language,hook,body,review_state)
   VALUES(NEW.id,'hi',NEW.hook_hi,NEW.body_hi,CASE WHEN NEW.status='live' THEN 'accepted'::review_verdict ELSE 'pending'::review_verdict END)
   ON CONFLICT(fact_id,language) DO UPDATE SET hook=excluded.hook,body=excluded.body,review_state=excluded.review_state;
 END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER sync_legacy_fact_texts_trg AFTER INSERT OR UPDATE OF hook_en,body_en,hook_hi,body_hi,status ON facts
 FOR EACH ROW EXECUTE FUNCTION sync_legacy_fact_texts();

CREATE OR REPLACE FUNCTION require_live_original_text() RETURNS trigger AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='facts' THEN target:=NEW.id;
 ELSIF TG_OP='DELETE' THEN target:=OLD.fact_id;
 ELSE target:=NEW.fact_id;
 END IF;
 IF EXISTS(SELECT 1 FROM facts f WHERE f.id=target AND f.status='live'
  AND NOT EXISTS(SELECT 1 FROM fact_texts t WHERE t.fact_id=f.id AND t.language=f.original_language AND t.review_state='accepted')) THEN
  RAISE EXCEPTION 'Live fact requires approved original text' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER facts_require_live_text AFTER INSERT OR UPDATE ON facts
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_live_original_text();
CREATE CONSTRAINT TRIGGER texts_require_live_original AFTER INSERT OR UPDATE OR DELETE ON fact_texts
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_live_original_text();

-- Validate rows already live, not only subsequent writes.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM facts f WHERE f.status='live' AND NOT EXISTS(
  SELECT 1 FROM fact_texts t WHERE t.fact_id=f.id AND t.language=f.original_language AND t.review_state='accepted')) THEN
  RAISE EXCEPTION 'Backfill/review required before enabling Hindi-only publication';
 END IF;
END $$;
