export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="notification-dot absolute -top-2 -right-3 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[0.62rem] font-black leading-none text-white ring-2">
      {count > 9 ? '9+' : count}
    </span>
  );
}
