import { FeedShell } from './FeedShell';
import { getFeedFacts } from '../lib/facts';

// Facts change only when the pipeline runs, so a static render with hourly
// revalidation is right — the feed does not need to hit Postgres per visitor.
export const revalidate = 3600;

export default async function Home() {
  const facts = await getFeedFacts();
  return <FeedShell facts={facts} />;
}
