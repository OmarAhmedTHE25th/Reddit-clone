import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchCommunities,
  type CommunityDto,
  type CommunitySummary,
} from '../../api/posts';
import { formatMembers, formatFullDate } from '../../utils/format';
import CommunityIcon from '../common/CommunityIcon';

export function PopularCommunities() {
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);

  useEffect(() => {
    let active = true;

    fetchCommunities(undefined, 5)
      .then((next) => {
        if (active) setCommunities(next);
      })
      .catch(() => {
        if (active) setCommunities([]);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="sidebar-card">
      <h2 className="sidebar-title">Popular communities</h2>

      {communities.map((community, index) => (
        <Link
          key={community.id}
          to={`/r/${community.name}`}
          className="sidebar-community"
        >
          <span className="sidebar-rank">{index + 1}</span>
          <CommunityIcon
            name={community.name}
            iconUrl={community.iconUrl}
            size={32}
          />
          <span className="sidebar-community-text">
            <span className="sidebar-community-name">r/{community.name}</span>
            <span className="sidebar-community-meta">
              {formatMembers(community.memberCount ?? 0)} members
            </span>
          </span>
        </Link>
      ))}

      {communities.length === 0 && (
        <p className="sidebar-meta">No communities yet.</p>
      )}
    </section>
  );
}

interface CommunitySidebarProps {
  community: CommunityDto;
  joined: boolean;
  onToggle: () => void;
}

export function CommunitySidebar({
  community,
  joined,
  onToggle,
}: CommunitySidebarProps) {
  return (
    <section className="sidebar-card">
      <h2 className="sidebar-title">About community</h2>

      <p className="sidebar-description">
        {community.description ?? 'No description yet.'}
      </p>

      <div className="sidebar-stats">
        <div>
          <strong>{formatMembers(community.memberCount)}</strong>
          <span>Members</span>
        </div>
        <div>
          <strong>{formatMembers(community.postCount)}</strong>
          <span>Posts</span>
        </div>
      </div>

      <p className="sidebar-meta">Created {formatFullDate(community.createdAt)}</p>
      <p className="sidebar-meta">
        Moderated by u/{community.creator.username}
      </p>

      <button
        type="button"
        className={
          joined ? 'btn btn-outline-blue join-toggle' : 'btn btn-primary'
        }
        onClick={onToggle}
      >
        <span className="join-label">{joined ? 'Joined' : 'Join'}</span>
        {joined && <span className="leave-label">Leave</span>}
      </button>
    </section>
  );
}
