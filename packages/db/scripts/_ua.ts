/**
 * The crawler's identity, in one place.
 *
 * Wikimedia requires a descriptive User-Agent with a working contact URL or
 * address on every request, and blocks generic ones. This was copied into four
 * separate scripts, which is four things to update and three chances to miss
 * one — the kind of drift that gets a crawler blocked at the worst moment.
 *
 * `connectors/src/http.ts` holds the same default for the pipeline itself. Both
 * read SACHMUCH_USER_AGENT first, so .env is the single override.
 */
export const USER_AGENT =
  process.env.SACHMUCH_USER_AGENT ??
  'SachmuchBot/0.1 (https://sachmuch.com; sanjay.nawandhar@gmail.com) node-fetch';
