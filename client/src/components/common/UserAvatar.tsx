import { useState } from 'react';

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: number;
}

export default function UserAvatar({
  username,
  avatarUrl,
  size = 36,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (username || '?').charAt(0).toUpperCase();

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={`u/${username} avatar`}
        className="avatar"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.floor(size * 0.44)),
      }}
      aria-label={`u/${username} avatar`}
    >
      {initial}
    </div>
  );
}
