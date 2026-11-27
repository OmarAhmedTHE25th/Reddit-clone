import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Compass, Home, Plus, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchMyCommunities,
  type CommunitySummary,
} from '../../api/posts';
import CommunityIcon from '../common/CommunityIcon';

function LeftNav() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);

  useEffect(() => {
    let active = true;

    if (!isAuthenticated) {
      setCommunities([]);
      return;
    }

    fetchMyCommunities()
      .then((next) => {
        if (active) setCommunities(next);
      })
      .catch(() => {
        if (active) setCommunities([]);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `left-nav-link${isActive ? ' active' : ''}`;

  return (
    <nav className="left-nav">
      <NavLink to="/" end className={linkClass}>
        <Home size={20} />
        Home
      </NavLink>
      <NavLink to="/popular" className={linkClass}>
        <Compass size={20} />
        Popular
      </NavLink>

      <div className="left-nav-divider" />

      {isAuthenticated ? (
        <>
          <p className="left-nav-heading">Communities</p>
          {communities.map((community) => (
            <NavLink
              key={community.id}
              to={`/r/${community.name}`}
              className={({ isActive }) =>
                `left-nav-community${isActive ? ' active' : ''}`
              }
            >
              <CommunityIcon
                name={community.name}
                iconUrl={community.iconUrl}
                size={24}
              />
              <span>{community.name}</span>
            </NavLink>
          ))}
          {communities.length === 0 && (
            <p className="left-nav-empty">
              Join a community and it will show up here.
            </p>
          )}
          <Link to="/submit" className="left-nav-create">
            <Plus size={18} />
            Create post
          </Link>
        </>
      ) : (
        <button
          type="button"
          className="left-nav-login"
          onClick={() => openAuthModal('login')}
        >
          <Users size={18} />
          Log in to join communities
        </button>
      )}
    </nav>
  );
}

interface Props {
  children: ReactNode;
  right?: ReactNode;
}

export default function AppShell({ children, right }: Props) {
  return (
    <div className={`app-shell${right ? '' : ' no-right'}`}>
      <aside className="left-nav-wrap">
        <LeftNav />
      </aside>
      <main className="feed-column">{children}</main>
      {right ? <aside className="right-sidebar">{right}</aside> : null}
    </div>
  );
}
