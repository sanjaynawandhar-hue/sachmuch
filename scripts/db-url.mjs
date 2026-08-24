/**
 * Builds a correct DATABASE_URL from the four connection parameters Supabase
 * shows, handling password encoding so it never has to be done by hand.
 *
 * A connection string is structured text, not free text: ':' '@' '/' '?' and '#'
 * mark where each piece begins and ends. A password containing any of them has
 * to be percent-encoded, or the parser reads the password's own punctuation as
 * structure and connects to the wrong place — usually with an error message that
 * points nowhere near the real cause.
 *
 * Usage:
 *   pnpm db:url            <- prompts for the password, nothing is echoed
 *   pnpm db:url --write    <- prompts, then updates .env
 *
 * Prompting rather than taking an argument is deliberate: a password passed on
 * the command line is written verbatim into ~/.zsh_history, which undoes most of
 * the point of rotating it. Passing it as an argument still works for scripts.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * The connection details are read from the DATABASE_URL already in .env, and
 * only the password is replaced. Hardcoding the host and project ref would put
 * a project identifier in the repo and would silently break the moment the
 * project moved.
 */
function currentParts() {
  const path = '.env';
  if (!existsSync(path)) return null;
  const line = readFileSync(path, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  try {
    const url = new URL(line.slice('DATABASE_URL='.length).trim());
    return { user: decodeURIComponent(url.username), host: url.hostname, port: url.port || '5432',
             db: url.pathname.replace(/^\//, '') || 'postgres' };
  } catch {
    return null;
  }
}

const write = process.argv.includes('--write');
const fromArg = process.argv.slice(2).find((a) => !a.startsWith('--'));

/** Reads a line without echoing it, so the password never appears on screen. */
async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  process.stdout.write(question);
  rl.output.write = (chunk, ...rest) => {
    // Suppress the echo of typed characters, but let our own prompt through.
    if (rl.stdoutMuted) return true;
    return process.stdout.constructor.prototype.write.call(process.stdout, chunk, ...rest);
  };
  rl.stdoutMuted = true;
  const answer = await new Promise((resolve) => rl.question('', resolve));
  rl.stdoutMuted = false;
  rl.close();
  process.stdout.write('\n');
  return answer;
}

const password = fromArg ?? (await prompt('New database password (typing is hidden): '));

if (!password) {
  console.error('No password entered.');
  process.exit(1);
}

// safe:'' forces every reserved character to be encoded, rather than trusting a
// default list that leaves some through.
const encoded = encodeURIComponent(password);

const changed = [...new Set(password)]
  .filter((ch) => encodeURIComponent(ch) !== ch)
  .map((ch) => `  ${ch}  ->  ${encodeURIComponent(ch)}`);

console.log(changed.length ? `characters that needed encoding:\n${changed.join('\n')}` : 'nothing needed encoding');

const parts = currentParts();
if (!parts) {
  console.error('Could not read a DATABASE_URL from .env to take the host and user from.');
  console.error('Copy the connection string from Supabase into .env first, then run this to');
  console.error('fix the password encoding.');
  process.exit(1);
}

const url = `postgresql://${parts.user}:${encoded}@${parts.host}:${parts.port}/${parts.db}`;

if (!write) {
  console.log(`\n${url.replace(`:${encoded}@`, ':<password>@')}`);
  console.log('\nrun again with --write to put it in .env');
} else {
  const path = '.env';
  const body = existsSync(path) ? readFileSync(path, 'utf8') : 'DATABASE_URL=\n';
  const next = body.includes('DATABASE_URL=')
    ? body.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`)
    : `DATABASE_URL=${url}\n${body}`;
  writeFileSync(path, next, 'utf8');
  console.log('\nwrote .env — run `pnpm db:check` to confirm it connects.');
}
