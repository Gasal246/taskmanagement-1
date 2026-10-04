"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
export default function BackgroundJobsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState("failed");
  const [page, setPage] = useState(1);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["background-jobs", status, page],
    enabled: Boolean(session?.user?.is_super), refetchInterval: 15_000,
    queryFn: async ({ signal }) => readResponse(await fetch(`/api/superadmin/jobs?status=${status}&page=${page}`, { cache: "no-store", signal })),
  });
  const retry = useMutation({ mutationFn: async (jobId: string) => readResponse(await fetch("/api/superadmin/jobs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }),
  })), onSuccess: () => client.invalidateQueries({ queryKey: ["background-jobs"] }) });
  if (sessionStatus === "loading") return <p className="p-6" role="status">Loading…</p>;
  if (!session?.user?.is_super) return <p className="p-6">Superadmin access required.</p>;
  const counts = Object.fromEntries((query.data?.counts || []).map((item: any) => [item._id, item.count]));
  return <main className="p-4 md:p-8 space-y-5">
    <h1 className="text-2xl font-semibold">Background jobs</h1>
    <p className="text-sm text-muted-foreground">Notifications and file cleanup run after actions are saved. Failed jobs remain here until reviewed.</p>
    <div className="flex flex-wrap gap-3" role="group" aria-label="Job status">
      {["failed", "pending", "processing", "completed"].map(value => <button key={value} aria-pressed={status === value}
        onClick={() => { setStatus(value); setPage(1); retry.reset(); }} className={`border rounded px-3 py-2 capitalize ${status === value ? "bg-primary text-primary-foreground" : ""}`}>
        {value} ({counts[value] || 0})</button>)}
    </div>
    {query.data?.oldestPendingAt && <p className="text-sm">Oldest queued job: {new Date(query.data.oldestPendingAt).toLocaleString()}. A growing queue can indicate a stopped worker.</p>}
    {query.isPending && <p role="status">Loading jobs…</p>}
    {query.isError && <p role="alert">{query.error.message} <button className="underline" onClick={() => query.refetch()}>Try again</button></p>}
    {retry.isError && <p role="alert">{retry.error.message}</p>}
    {retry.isSuccess && <p role="status">Retry queued.</p>}
    {query.data && !query.data.jobs.length && <p>No {status} jobs.</p>}
    {!!query.data?.jobs.length && <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <caption className="sr-only">Background jobs, newest first</caption>
      <thead><tr>{["Type", "Attempts", "Last error", "Created", "Action"].map(label => <th key={label} scope="col" className="p-3 border-b">{label}</th>)}</tr></thead>
      <tbody>{query.data.jobs.map((job: any) => <tr key={job._id}>
        <td className="p-3 border-b">{job.kind}</td><td className="p-3 border-b">{job.attempts} ({job.retry_count} retries)</td>
        <td className="p-3 border-b">{job.last_error || "—"}</td><td className="p-3 border-b whitespace-nowrap">{new Date(job.createdAt).toLocaleString()}</td>
        <td className="p-3 border-b">{job.status === "failed" && <button disabled={retry.isPending} className="border rounded px-3 py-1 disabled:opacity-50" onClick={() => retry.mutate(job._id)}>Retry</button>}</td>
      </tr>)}</tbody>
    </table></div>}
    <div className="flex gap-4 items-center"><button disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)} className="border rounded px-3 py-2 disabled:opacity-50">Previous</button>
      <span>Page {page}</span><button disabled={!query.data || page * 25 >= query.data.total || query.isFetching} onClick={() => setPage(page + 1)} className="border rounded px-3 py-2 disabled:opacity-50">Next</button></div>
  </main>;
}
