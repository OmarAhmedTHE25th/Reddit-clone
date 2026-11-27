import { useAuth } from '../context/AuthContext';
import FeedPage from '../components/feed/FeedPage';
import { PopularCommunities } from '../components/layout/Sidebars';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <FeedPage
      feed="home"
      title="Home"
      defaultSort="best"
      showBest
      right={<PopularCommunities />}
      emptyTitle="Your home feed is empty"
      emptyBody="Join some communities to see their posts here."
      emptyCta={{ to: '/popular', label: 'Explore popular posts' }}
    />
  ) : (
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
