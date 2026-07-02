interface LiveBadgeProps {
  elapsed: number | null;
}

export function LiveBadge({ elapsed }: LiveBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
      {elapsed !== null ? `${elapsed}'` : "LIVE"}
    </span>
  );
}
