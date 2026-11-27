const COLORS = [
  '#ff4500',
  '#0079d3',
  '#00a86b',
  '#8e44ad',
  '#e67e22',
  '#16a085',
  '#c0392b',
  '#2c3e50',
  '#d35400',
  '#27ae60',
];

function hash(name: string): number {
  let value = 0;
  for (let index = 0; index < name.length; index += 1) {
    value = (value * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(value);
}

interface Props {
  name: string;
  iconUrl?: string | null;
  size?: number;
}

export default function CommunityIcon({ name, iconUrl, size = 20 }: Props) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="community-icon"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="community-icon"
      style={{
        width: size,
        height: size,
        background: COLORS[hash(name) % COLORS.length],
        fontSize: Math.max(10, size * 0.52),
      }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
