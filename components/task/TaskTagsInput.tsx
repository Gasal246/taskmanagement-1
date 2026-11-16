"use client";

import { useCallback, useId, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeTaskTags, parseTaskTags } from "@/lib/task-tags";

export function useTaskTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const reset = useCallback((value: string[] = []) => { setTags(value); setDraft(""); }, []);
  return {
    tags, draft, setTags, setDraft,
    getTags: () => normalizeTaskTags([...tags, ...parseTaskTags(draft)]),
    reset,
  };
}

export function TaskTagsInput({ input, className = "" }: {
  input: ReturnType<typeof useTaskTags>;
  className?: string;
}) {
  const id = useId();
  const commit = () => {
    input.setTags(input.getTags());
    input.setDraft("");
  };

  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold text-slate-300">Hashtags</label>
      {input.tags.length > 0 && (
        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto" aria-label="Task hashtags">
          {input.tags.map((tag, index) => (
            <span key={tag} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-800/60 bg-cyan-950/40 px-2 py-1 text-xs text-cyan-100">
              <span className="min-w-0 break-words">#{tag}</span>
              <button type="button" aria-label={`Remove hashtag ${tag}`} onClick={() => input.setTags(input.tags.filter((_, i) => i !== index))} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                <X size={10} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={input.draft}
        aria-describedby={`${id}-help`}
        placeholder="Eg: #Meeting #Operation Team"
        className="border-slate-700 bg-slate-950/40 text-slate-100"
        onChange={event => {
          const raw = event.target.value;
          const value = raw && !raw.startsWith("#") ? `#${raw}` : raw;
          const lastHash = value.lastIndexOf("#");
          if (lastHash > 0) {
            input.setTags(normalizeTaskTags([...input.tags, ...parseTaskTags(value.slice(0, lastHash))]));
            input.setDraft(value.slice(lastHash));
          } else {
            input.setDraft(value);
          }
        }}
        onBlur={commit}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter" || (event.key === " " && input.draft.endsWith(" "))) {
            event.preventDefault();
            commit();
          }
        }}
      />
      <p id={`${id}-help`} className="text-[11px] text-slate-500">Start each tag with #. Spaces stay inside a tag. Press Enter, double-space, or type the next # to add it.</p>
    </div>
  );
}
