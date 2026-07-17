export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="mobile-bottom-nav-badge notification-dot">
      {count > 9 ? '9+' : count}
    </span>
  );
}
