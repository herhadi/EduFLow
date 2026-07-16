import { cn } from '../../lib/cn';

export function UserAvatar({ className, name, photoUrl }: { className?: string; name: string; photoUrl?: string | null }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'EF';
  return (
    <span className={cn('grid size-16 shrink-0 place-items-center overflow-hidden rounded-[1.35rem] border border-blue-100 bg-brand-600 text-xl font-black text-white dark:border-blue-400/20', className)}>
      {photoUrl ? <img alt={`Foto ${name}`} className="size-full object-cover" src={photoUrl} /> : initials}
    </span>
  );
}
