export function TaskTagChips({ tags = [] }: { tags?: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="mt-2 flex max-h-16 min-w-0 flex-wrap gap-1 overflow-y-auto" aria-label="Task hashtags" tabIndex={0} onKeyDown={event => event.stopPropagation()}>
      {tags.map(tag => (
        <span key={tag} className="max-w-full break-words rounded-full border border-cyan-800/50 bg-cyan-950/30 px-1.5 py-0.5 text-[9px] leading-3 text-cyan-200">#{tag}</span>
      ))}
    </div>
  );
}
