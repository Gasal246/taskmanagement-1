import LargeViewsFixture from "./large-views.fixture";
import OrganizationOverviewsFixture from "./organization-overviews.fixture";
import SessionRecoveryFixture from "./session-recovery.fixture";
import BackgroundJobsPage from "@/app/(superadmin)/superadmin/jobs/page";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import VirtualHistoryList from "@/components/shared/VirtualHistoryList";
import ListPagination from "@/components/shared/ListPagination";
import { useActivityPaging } from "@/hooks/use-activity-paging";
import { useGetTaskById } from "@/query/business/queries";
import { useGetEnquiryHistories } from "@/query/enquirymanager/queries";

const state = (window as any).listChecks = { jobRetryCalls: 0, jobRequests: [] as string[], requests: [] as any[], aborted: 0, errors: [] as string[] };
window.addEventListener("error", event => state.errors.push(event.message));
axios.defaults.adapter = config => new Promise((resolve, reject) => {
  state.requests.push({ url: config.url, params: config.params });
  const timer = setTimeout(() => {
    config.signal?.removeEventListener?.("abort", abort);
    if (config.url?.includes("/get-complete")) {
      if ((state as any).orgFailNext) { (state as any).orgFailNext = false; reject(new axios.AxiosError("Network error")); return; }
      const { mode, section, page = 1, search, region_id } = config.params;
      const total = search ? 1 : section === "available_staffs" ? 10000 : (state as any).orgTotal || 61;
      const label = region_id.endsWith("b") ? "B" : "A";
      const size = Math.max(0, Math.min(25, total - (page - 1) * 25));
      resolve({ config, status: 200, statusText: "OK", headers: {}, data: mode === "summary"
        ? { data: { organization: { _id: region_id }, counts: { heads: (state as any).orgTotal || 61, staffs: 10000 } } }
        : { data: Array.from({ length: size }, (_, i) => ({ _id: `${label}-${page}-${i}`, [section === "available_staffs" ? "user_id" : "user"]: { name: search ? `${label} last [.*] person` : `${label} page ${page} person ${i}` } })), pagination: { page, limit: 25, total, pages: Math.max(1, Math.ceil(total / 25)) } } });
      return;
    }
    if (config.url?.includes("/calendar/feed")) {
      const url = new URL(config.url, location.origin);
      const cursor = url.searchParams.get("cursor"), filtered = !!url.searchParams.get("search");
      resolve({ config, status: 200, statusText: "OK", headers: {}, data: { items: [{ title: filtered ? "Filtered" : cursor ? "Second" : "First" }], summary: { total: filtered ? 1 : 200 }, pagination: { nextCursor: !filtered && !cursor ? "page-two" : null } } });
      return;
    }
    if (config.url?.includes("/camps/map")) {
      resolve({ config, status: 200, statusText: "OK", headers: {}, data: { camps: [], clusters: [], visibleTotal: 10000 } });
      return;
    }
    const page = config.params.activityId ? 3 : config.params.page || 1;
    resolve({ config, status: 200, statusText: "OK", headers: {}, data: config.url?.includes("/task/")
      ? { data: { activities: [{ _id: "row", activity: `Page ${page}` }], activityPagination: { page, pages: 5, total: 125, limit: 25 } } }
      : { histories: [], responseMode: config.url?.includes("staff-side") ? "staff" : "admin" } });
  }, 500);
  const abort = () => { clearTimeout(timer); state.aborted++; reject(new axios.CanceledError()); };
  config.signal?.addEventListener?.("abort", abort);
});

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith("/api/superadmin/jobs")) return originalFetch(input, init);
  state.jobRequests.push(url);
  await new Promise(resolve => setTimeout(resolve, 150));
  if (init?.method === "POST") {
    state.jobRetryCalls++;
    return Response.json({ message: state.jobRetryCalls === 1 ? "Provider is still unavailable" : "Retry queued" }, { status: state.jobRetryCalls === 1 ? 503 : 200 });
  }
  const params = new URL(url, location.origin).searchParams;
  const status = params.get("status") || "failed";
  const page = Number(params.get("page") || 1);
  const total = status === "failed" ? 26 : status === "pending" ? 1 : 0;
  const size = Math.min(25, Math.max(0, total - (page - 1) * 25));
  return Response.json({ jobs: Array.from({ length: size }, (_, index) => ({
    _id: `${status}-${page}-${index}`, kind: "storage-delete", status, attempts: 8,
    last_error: status === "failed" ? "job/provider-or-database-error" : null,
    createdAt: "2026-10-01T10:00:00Z", retry_count: 0,
  })), page, total, counts: [{ _id: "failed", count: 26 }, { _id: "pending", count: 1 }], oldestPendingAt: "2026-10-01T10:00:00Z" });
};

function Fixture() {
  const [recovery, setRecovery] = useState(false);
  const [organization, setOrganization] = useState(false);
  const [jobs, setJobs] = useState(false);
  const paging = useActivityPaging("fixture-task", "notification-anchor");
  const task = useGetTaskById("fixture-task", undefined, paging.query);
  const [mode, setMode] = useState<"admin" | "staff">("admin");
  const history = useGetEnquiryHistories("fixture-enquiry", { page: 1 }, mode);
  const rows = Array.from({ length: 25 }, (_, index) => ({ _id: `history-${index}`, index }));
  const [large, setLarge] = useState(false);
  if (recovery) return <SessionRecoveryFixture />;
  if (organization) return <><button id="session-recovery" onClick={() => setRecovery(true)}>Session recovery</button><OrganizationOverviewsFixture /></>;
  if (large) return <><button id="organization" onClick={() => setOrganization(true)}>Organization overviews</button><LargeViewsFixture /></>;
  if (jobs) return <><button id="large" onClick={() => setLarge(true)}>Large views</button><BackgroundJobsPage /></>;
  return <main>
    <button id="jobs" onClick={() => setJobs(true)}>Background jobs</button>
    <h1>List behavior fixture</h1>
    <p id="task-result">{task.data?.data.activities[0]?.activity || "Loading"}</p>
    <p id="loading">{task.isFetching || paging.isChanging ? "updating" : "ready"}</p>
    <ListPagination pagination={task.data?.data.activityPagination} busy={task.isFetching || paging.isChanging} onPage={paging.setPage} label="activities" />
    <button id="search" onClick={() => paging.setSearch("literal [.*]")}>Search literal term</button>
    <button id="pending" onClick={() => paging.setStatus("pending")}>Filter pending</button>
    <button id="completed" onClick={() => paging.setStatus("completed")}>Filter completed</button>
    <button id="cached" onClick={() => { paging.setSearch(""); paging.setStatus(""); paging.setPage(4); }}>Return to cached page four</button>
    <button id="staff" onClick={() => setMode("staff")}>Staff history</button>
    <p id="history-mode">{history.data?.responseMode || "Loading"}</p>
    <VirtualHistoryList rows={rows} renderRow={row => <article data-row={row.index} style={{ minHeight: 80 + row.index % 4 * 30, padding: 12, border: "1px solid #444", overflowWrap: "anywhere" }}><h2>Record {row.index}</h2><p>Variable height history content with a long field value.</p></article>} />
  </main>;
}
const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000, refetchOnWindowFocus: false } } });
createRoot(document.getElementById("root")!).render(<SessionProvider session={{ user: { id: "fixture-user", is_super: true }, expires: "2099-01-01T00:00:00Z" }} refetchOnWindowFocus={false}><QueryClientProvider client={client}><Fixture /></QueryClientProvider></SessionProvider>);
