# Sources

Every source the app draws on, with its endpoint, licence, attribution requirement and rate
limit. Recorded when the connector is built, not afterwards.

Machine-readable twin: `packages/db/src/sources.ts`, seeded into the `sources` table.

**Excluded by policy:** anything requiring payment, IMDb, Rotten Tomatoes, paid sports feeds, and
scraped content from commercial publishers.

---

## The licensing rule that governs everything below

- **Wikidata structured statements are CC0.** No attribution obligation, no share-alike. This is
  what makes the corpus safe to build a commercial product on, and it should be the majority of it.
- **Wikipedia and DYK prose are CC BY-SA.** Attribution *and* share-alike. So we never copy a
  Wikipedia sentence into a fact body. The article locates the claim and its citation; the
  sentence is rendered from structured data through our own template; the article URL is stored
  as the source. Where CC BY-SA text is genuinely displayed, the licence field is set and the
  credit line renders on the card.
- **Wikimedia requires a descriptive User-Agent with a contact URL** on every request. Set once,
  globally, in `connectors/src/http.ts` so a new connector cannot forget it.

---

## Tier 1 — the engine

### `wikidata-sparql` — Wikidata Query Service
| | |
|---|---|
| Endpoint | `https://query.wikidata.org/sparql` |
| Licence | **CC0** |
| Attribution | Not required |
| Key | None |
| Rate limit | 30 rpm (self-imposed; we crawl once, not continuously) |
| Schedule | `0 2 * * *` |

The single most important source. Every entity carries a QID, which is what makes the fact graph
possible. Hard 60-second query timeout — templates must not carry their own `LIMIT`; the
connector pages with `LIMIT`/`OFFSET` at 500 rows. Queries that exceed a safe URL length switch
from GET to POST, losing edge caching but nothing else.

Label convention every template query must follow, and why it is not the label service:

```sparql
?person rdfs:label ?personLabelEn . FILTER(LANG(?personLabelEn) = "en")
OPTIONAL { ?person rdfs:label ?personLabelHi . FILTER(LANG(?personLabelHi) = "hi") }
OPTIONAL { ?person wdt:P21 ?personGender . }
```

`SERVICE wikibase:label` with a `"en,hi"` fallback list silently returns the English label under
the Hindi variable name. Binding per language is what lets us know Hindi is missing.

### `wikipedia-onthisday` — On This Day feed
| | |
|---|---|
| Endpoint | `https://{en,hi}.wikipedia.org/api/rest_v1/feed/onthisday/all/{mm}/{dd}` |
| Licence | CC BY-SA 4.0 |
| Attribution | **Required** — "From Wikipedia, CC BY-SA 4.0" |
| Key | None |
| Rate limit | 60 rpm |
| Schedule | `0 3 * * *` |

English and Hindi, walked across all 366 days. Events, births, deaths, holidays. Feeds the
"On this day in India" rail.

### `wikipedia-dyk` — Did You Know archive
| | |
|---|---|
| Endpoint | `https://en.wikipedia.org/wiki/Wikipedia:Recent_additions` |
| Licence | CC BY-SA 4.0 |
| Attribution | **Required** |
| Key | None |
| Rate limit | 30 rpm |
| Schedule | `0 4 * * 0` |

Running since February 2004; tens of thousands of hooks. Used strictly as a **pointer** to claims
and their citations, never as text to copy.

---

## Tier 2 — breadth

### `tmdb` — The Movie Database
| | |
|---|---|
| Endpoint | `https://api.themoviedb.org/3` |
| Licence | Terms of use |
| Attribution | **Required** — "This product uses the TMDB API but is not endorsed or certified by TMDB." |
| Key | Free, `TMDB_API_KEY` |
| Rate limit | 40 rpm |
| Schedule | `0 5 * * *` |

Person and title data for Bollywood, Hollywood, Actors and Television. Attribution goes on the
card footer when a fact came from TMDB, and on the Sources screen.

### `world-bank` — World Bank Indicators API
| | |
|---|---|
| Endpoint | `https://api.worldbank.org/v2` |
| Licence | CC BY 4.0 |
| Attribution | **Required** — "Source: World Bank Open Data, CC BY 4.0" |
| Key | **None at all** |
| Rate limit | 60 rpm |
| Schedule | `0 6 * * 1` |

Economy, population, energy, climate. Feeds Finance and Environment.

### `data-gov-in` — data.gov.in
| | |
|---|---|
| Endpoint | `https://api.data.gov.in/resource/{id}` |
| Licence | NDSAP terms |
| Attribution | **Required** — "Source: data.gov.in, Government of India (NDSAP)" |
| Key | Free, `DATA_GOV_IN_KEY` |
| Rate limit | 30 rpm |
| Schedule | `0 7 * * 2` |

80,000+ datasets: railways, census, agriculture, banking. This is the source that makes the India
categories genuinely local rather than Wikipedia-translated.

### `opentdb` — Open Trivia Database
| | |
|---|---|
| Endpoint | `https://opentdb.com/api.php` |
| Licence | CC BY-SA 4.0 |
| Attribution | **Required** |
| Key | None |
| Rate limit | 12 rpm (one request per 5 seconds by their policy) |
| Schedule | `0 8 * * 3` |

Q&A converted into fact statements. English only — these are flagged `hi_missing` and never
reach the Hindi feed.

### `numbers-api` — Numbers API
| | |
|---|---|
| Endpoint | `http://numbersapi.com` |
| Licence | Terms of use |
| Attribution | **Required** |
| Key | None |
| Rate limit | 60 rpm |
| Schedule | `0 9 * * *` |

**HTTP-only.** A browser on an HTTPS page blocks it as mixed content, so it is fetched
server-side in the pipeline and never from the client. The quality gate rejects plain-HTTP
citations, so a Numbers API fact needs a different displayable source or it does not publish.

### `useless-facts` — Useless Facts API
| | |
|---|---|
| Endpoint | `https://uselessfacts.jsph.pl/api/v2/facts/random` |
| Licence | CC BY-SA 3.0 |
| Attribution | **Required** |
| Key | None |
| Rate limit | 30 rpm |
| Schedule | `30 9 * * *` |

Has a `language` parameter and each fact ships with a source field.

### `musicbrainz` — MusicBrainz
| | |
|---|---|
| Endpoint | `https://musicbrainz.org/ws/2` |
| Licence | CC0 (core data) |
| Attribution | Not required |
| Key | None |
| Rate limit | 50 rpm — their policy is one request per second, and a User-Agent is mandatory |
| Schedule | `0 10 * * 4` |

### `open-food-facts` — Open Food Facts
| | |
|---|---|
| Endpoint | `https://world.openfoodfacts.org/api/v2` |
| Licence | ODbL (database), CC BY-SA (content) |
| Attribution | **Required** |
| Key | None |
| Rate limit | 30 rpm |
| Schedule | `0 11 * * 5` |

### `gbif` — GBIF species API
| | |
|---|---|
| Endpoint | `https://api.gbif.org/v1` |
| Licence | CC BY 4.0 |
| Attribution | **Required** |
| Key | None |
| Rate limit | 60 rpm |
| Schedule | `0 12 * * 6` |

### `pubchem` — PubChem PUG REST
| | |
|---|---|
| Endpoint | `https://pubchem.ncbi.nlm.nih.gov/rest/pug` |
| Licence | Public domain (US government work) |
| Attribution | Not required |
| Key | None |
| Rate limit | 60 rpm — their policy caps at 5 requests/second |
| Schedule | `0 13 * * 1` |

### `nasa-open` — NASA Open APIs
| | |
|---|---|
| Endpoint | `https://api.nasa.gov` |
| Licence | Public domain |
| Attribution | Not required |
| Key | Free, `NASA_API_KEY`. `DEMO_KEY` works but is heavily throttled |
| Rate limit | 30 rpm |
| Schedule | `0 14 * * *` |
