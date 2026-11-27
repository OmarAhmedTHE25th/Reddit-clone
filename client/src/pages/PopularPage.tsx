import FeedPage from '../components/feed/FeedPage';
import { PopularCommunities } from '../components/layout/Sidebars';

export default function PopularPage() {
  return (
    <FeedPage
      feed="popular"
      title="Popular"
      defaultSort="hot"
      right={<PopularCommunities />}
      emptyTitle="No posts yet"
      emptyBody="Be the first to post something."
    />
  );
}
