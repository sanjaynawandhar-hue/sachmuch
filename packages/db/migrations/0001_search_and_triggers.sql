-- Hand-written companion to the generated schema.
--
-- Drizzle emits tables, constraints and indexes but not extensions, generated
-- search vectors, or triggers. Everything here is deliberately in the database
-- rather than in application code, because the pipeline runs unattended at 2am
-- and application code is exactly what gets bypassed then.

-- §3 — trigram similarity for dedupe. NOT pgvector: embeddings would mean
-- running a model, and template-generated text is formulaic enough that
-- trigrams do the job.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ─────────────────────────── full-text search ───────────────────────────
-- Postgres ships no Hindi stemmer, so Hindi uses the 'simple' configuration:
-- exact token matching, no stemming. That is honest rather than clever — a
-- wrong stemmer is worse than none.

CREATE OR REPLACE FUNCTION facts_search_refresh() RETURNS trigger AS $$
BEGIN
  NEW.search_en :=
    setweight(to_tsvector('english', coalesce(NEW.hook_en, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body_en, '')), 'B');
  NEW.search_hi :=
    setweight(to_tsvector('simple', coalesce(NEW.hook_hi, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.body_hi, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facts_search_refresh_trg
  BEFORE INSERT OR UPDATE OF hook_en, body_en, hook_hi, body_hi ON facts
  FOR EACH ROW EXECUTE FUNCTION facts_search_refresh();

CREATE INDEX facts_search_en_idx ON facts USING GIN (search_en);
CREATE INDEX facts_search_hi_idx ON facts USING GIN (search_hi);

-- §7.3 — near-duplicate detection inside a category.
CREATE INDEX facts_hook_trgm_idx ON facts USING GIN (hook_en gin_trgm_ops);
CREATE INDEX facts_hook_hi_trgm_idx ON facts USING GIN (hook_hi gin_trgm_ops);

-- ────────────────────────── report auto-hide ────────────────────────────
-- §7.7 — three reports auto-hide a fact pending review. In a trigger so it
-- holds no matter which client or job inserted the report.

CREATE OR REPLACE FUNCTION reports_autohide() RETURNS trigger AS $$
DECLARE
  n smallint;
BEGIN
  UPDATE facts
     SET report_count = report_count + 1
   WHERE id = NEW.fact_id
  RETURNING report_count INTO n;

  IF n >= 3 THEN
    UPDATE facts SET status = 'hidden' WHERE id = NEW.fact_id AND status = 'live';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_autohide_trg
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION reports_autohide();

-- ─────────────────── subtopic live counts, for §9 top-up ─────────────────
-- The never-empty guarantee reads live_fact_count to find thin subtopics, so it
-- has to be maintained by the database rather than recomputed by a job.

CREATE OR REPLACE FUNCTION subtopic_count_refresh() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'live' AND NEW.subtopic_id IS NOT NULL THEN
      UPDATE subtopics SET live_fact_count = live_fact_count + 1 WHERE id = NEW.subtopic_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'live' AND OLD.subtopic_id IS NOT NULL THEN
      UPDATE subtopics SET live_fact_count = greatest(0, live_fact_count - 1) WHERE id = OLD.subtopic_id;
    END IF;
  ELSE
    IF OLD.status <> 'live' AND NEW.status = 'live' AND NEW.subtopic_id IS NOT NULL THEN
      UPDATE subtopics SET live_fact_count = live_fact_count + 1 WHERE id = NEW.subtopic_id;
    ELSIF OLD.status = 'live' AND NEW.status <> 'live' AND OLD.subtopic_id IS NOT NULL THEN
      UPDATE subtopics SET live_fact_count = greatest(0, live_fact_count - 1) WHERE id = OLD.subtopic_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subtopic_count_refresh_trg
  AFTER INSERT OR DELETE OR UPDATE OF status ON facts
  FOR EACH ROW EXECUTE FUNCTION subtopic_count_refresh();

-- ───────────────────────── entity fact counts ───────────────────────────
-- Entity pages rank by how many facts touch them.

CREATE OR REPLACE FUNCTION entity_count_refresh() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE entities SET fact_count = fact_count + 1 WHERE qid = NEW.qid;
  ELSE
    UPDATE entities SET fact_count = greatest(0, fact_count - 1) WHERE qid = OLD.qid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_count_refresh_trg
  AFTER INSERT OR DELETE ON fact_entities
  FOR EACH ROW EXECUTE FUNCTION entity_count_refresh();

-- ──────────────────────────── staleness sweep ───────────────────────────
-- §6 — decaying facts ("the tallest", "the current CEO") expire rather than
-- quietly becoming wrong. Called nightly by the pipeline.

CREATE OR REPLACE FUNCTION sweep_stale_facts() RETURNS integer AS $$
DECLARE
  n integer;
BEGIN
  UPDATE facts
     SET status = 'stale'
   WHERE status = 'live'
     AND valid_until IS NOT NULL
     AND valid_until < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$ LANGUAGE plpgsql;
