export default function PostSkeleton() {
  return (
    <div className="post-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-meta" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-pill" />
    </div>
  );
}
