"use client";
import { Button } from "@/components/ui/button";

export default function ListPagination({ pagination, busy, onPage, label = "records" }: {
  pagination?: { page: number; pages: number; total: number; limit: number };
  busy?: boolean; onPage: (page: number) => void; label?: string;
}) {
  if (!pagination) return null;
  const { page, pages, total, limit } = pagination;
  return <nav aria-label={`${label} pagination`} className="my-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
    <p aria-live="polite">{total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total} ${label}` : `No matching ${label}`}{busy && " · Updating…"}</p>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span>Page {page} of {pages}</span>
      <Button size="sm" variant="outline" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  </nav>;
}
