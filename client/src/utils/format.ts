export function formatScore(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs < 1000) return `${value}`;
  if (abs < 1_000_000) {
    return `${sign}${trimZero((abs / 1000).toFixed(1))}k`;
  }
  return `${sign}${trimZero((abs / 1_000_000).toFixed(1))}m`;
}

export function formatMembers(value: number): string {
  if (value < 1000) return `${value}`;
  if (value < 1_000_000) {
    return `${trimZero((value / 1000).toFixed(1))}k`;
  }
  return `${trimZero((value / 1_000_000).toFixed(1))}m`;
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );

  if (seconds < 60) return 'now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min. ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr. ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo. ago`;

  const years = Math.floor(months / 12);
  return `${years} yr. ago`;
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function splitTldr(title: string): { isTldr: boolean; text: string } {
  const match = /^tl;?dr:\s*/i.exec(title);
  return match
    ? { isTldr: true, text: title.slice(match[0].length) }
    : { isTldr: false, text: title };
}
