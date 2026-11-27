import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock, Flame, Sparkles, TrendingUp } from 'lucide-react';

export interface SortState {
  sort: string;
  t: string;
}

const SORTS = [
  { value: 'best', label: 'Best', icon: Sparkles },
  { value: 'hot', label: 'Hot', icon: Flame },
  { value: 'new', label: 'New', icon: Clock },
  { value: 'top', label: 'Top', icon: TrendingUp },
] as const;

const TIMES = [
  { value: 'hour', label: 'Now' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
] as const;

interface Props {
  sort: string;
  t: string;
  onChange: (next: SortState) => void;
  showBest?: boolean;
}

export default function SortBar({ sort, t, onChange, showBest }: Props) {
  const [open, setOpen] = useState<'sort' | 'time' | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSort = SORTS.find((item) => item.value === sort) ?? SORTS[1];
  const activeTime = TIMES.find((item) => item.value === t) ?? TIMES[1];
  const SortIcon = activeSort.icon;

  function selectSort(value: string) {
    onChange({ sort: value, t: value === 'top' ? t : 'day' });
    setOpen(value === 'top' ? 'time' : null);
  }

  return (
    <div
      className="sort-bar"
      ref={wrapperRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(null);
      }}
    >
      <div className="sort-dropdown">
        <button
          type="button"
          className="sort-button"
          aria-haspopup="menu"
          aria-expanded={open === 'sort'}
          onClick={() => setOpen(open === 'sort' ? null : 'sort')}
        >
          <SortIcon size={16} />
          <span>{activeSort.label}</span>
          <ChevronDown size={14} />
        </button>

        {open === 'sort' && (
          <div className="sort-menu" role="menu">
            {SORTS.filter((item) => showBest || item.value !== 'best').map(
              (item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={item.value === sort}
                    className={item.value === sort ? 'active' : undefined}
                    onClick={() => selectSort(item.value)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>

      {sort === 'top' && (
        <div className="sort-dropdown">
          <button
            type="button"
            className="sort-button"
            aria-haspopup="menu"
            aria-expanded={open === 'time'}
            onClick={() => setOpen(open === 'time' ? null : 'time')}
          >
            <span>{activeTime.label}</span>
            <ChevronDown size={14} />
          </button>

          {open === 'time' && (
            <div className="sort-menu" role="menu">
              {TIMES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={item.value === t}
                  className={item.value === t ? 'active' : undefined}
                  onClick={() => {
                    onChange({ sort, t: item.value });
                    setOpen(null);
                  }}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
