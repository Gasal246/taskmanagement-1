# Performance and security implementation

This change implements the first substantial group of audit actions, the second-stage enquiry/dashboard authorization changes, pagination/rendering improvements for task activities and enquiry histories, durable background processing for the task/enquiry flows listed below, bounded facility map/calendar views, and dashboard/organization overview optimizations. It does not certify a capacity of 3,000 users or complete every architectural recommendation. No production database migration, deployment, credential rotation or load test was performed.

## Implemented behavior

| Area | Change | Relevant code |
| --- | --- | --- |
| Recovery | Cryptographic, hashed, expiring recovery proofs; bounded attempts; one-time transactional consumption; prior sessions revoked after password changes | `lib/password-reset.ts`, `auth.ts`, recovery routes and pages |
| Authorization | API authentication baseline, superadmin guards, stored business membership checks for organization reads and ownership checks for mutations, user profile/document access and staff assignment management, business-scoped agent management and task deletion; private Pusher channel checks | `middleware.ts`, `lib/server-access.ts`, `lib/organization-access.ts`, `app/api/pusher/auth/route.ts` |
| Enquiry authorization | Immutable business ownership; own-business administration; explicit sharing and actual action assignments retain limited access; parent checks on comments, contacts, history and edit requests; business-scoped lists, exports, user logs and counts; shared-facility writes/deletes guarded; edits cannot approve pending enquiries | `lib/enquiries/access.ts`, `lib/enquiries/completion-server.ts`, enquiry route handlers |
| Dashboard authorization | All twelve organizational roles require an active stored role, assignment and business membership; task/project summaries are scoped to the verified business; inactive businesses are rejected | `lib/dashboard-access.ts`, dashboard/profile routes, domain selector |
| Dashboard performance | One team-membership read shared by task/project filters; one task-status aggregation; reuse of the authorized organization in dashboard/profile responses; parallel independent reads and bounded project field projection | `app/api/users/get-user/all-details/route.ts`, `app/api/users/get/staff/get-profile/route.ts`, `lib/dashboard-organization.ts` |
| Organization overviews | Separate full-count summaries and bounded searchable sections across seven overview APIs; lists and assignment choices load on demand; cached queries replace duplicated read mutations | `lib/organization-overview.ts`, `hooks/use-organization-overview.ts`, `components/admin/OrganizationSectionControls.tsx`, region/department administration pages |
| Agent identity safety | Removing an agent affects only the selected business's AGENT role; identities with other roles or memberships survive; business admins cannot globally block shared accounts; account status changes revoke sessions | `lib/enquiries/agent-access.ts`, agent management routes |
| Sensitive data | User and superadmin password fields are excluded by default; nested user aggregation joins explicitly exclude passwords, OTPs and session metadata | user models and organization aggregation routes |
| Database lifecycle | Connections are awaited by API handlers; shared connection attempts can recover after failures; pool and wait bounds; startup index builds disabled by default in production | `lib/mongo.ts`, API route handlers |
| Enquiry lists | Action and approval filters run in MongoDB before page boundaries; histories are enriched only for the page; default admin listing joins Facility records after pagination; staff lists use database pagination | `lib/enquiries/admin-list.ts`, `lib/enquiries/action-filter-pipeline.ts`, staff enquiry route |
| Task search | Activity existence lookups are scoped to authorized tasks and return bounded markers, preserving visible-activity filtering and match badges | `lib/tasks/filter-pipeline.ts`, admin/staff filtered-task routes |
| Task activity pages | Bounded reads; search and status filters precede pagination; summary counts cover the entire authorized set; notification links resolve the page containing the visible activity; page-only population and unread counts | `lib/tasks/activity-page.ts`, task detail API, admin/staff task pages |
| Enquiry history pages | Bounded reads after visibility/type filtering; duplicate access grants and orphaned references do not inflate results; stable ordering; small header metadata replaces a separate full enquiry-detail request | `lib/enquiries/history-page.ts`, history APIs |
| History rendering | Shared admin/staff history screen; variable-height virtualization with a full-page accessibility option; spreadsheet code loaded on export; bounded cancellable exports | `components/enquiries/EnquiryHistoryPage.tsx`, `components/shared/VirtualHistoryList.tsx` |
| Paged query state | Session/mode/domain-aware cache keys, request cancellation, 15-second timeouts, debounced activity filters and preserved prior results; inactive detail/history pages expire from the cache after one minute | query hooks/functions, `hooks/use-activity-paging.ts`, shared pagination |
| Calendar | Exact requested date bounds, maximum 93-day range, database overlap queries, persisted head/admin scopes and modern per-assignee enquiry actions | calendar feed and workspace |
| Large geographic/calendar views | Indexed rectangular map queries, bounded server clusters, page-only facility population, full-filter legend totals and searchable location pages; calendar keyset pages across all sources with full-result counts and page-only population | `lib/maps`, `lib/calendar/feed-page.ts`, map/calendar APIs and screens |
| Repeated reads | Catalogue reads are coalesced and cached locally for five seconds; writes invalidate local cache and validation always uses fresh data; notification reads no longer delete expired records; independent profile reads run concurrently | catalogue server, notification routes, complete-profile route |
| Network/state | Thirty-second query freshness; session-specific list keys; cancellation and timeouts for enquiry/calendar reads; surfaced request errors; duplicate task-activity refetches removed; project details retain a useful cache | query helpers/provider and task pages |
| Initial loading | Firebase notification UI loads after authentication and browser idle time; bootstrap requests only business summary data | `DeferredNotifications.tsx`, `AppBootstrap.tsx`, business lookup |
| Workflow | Staff identity survives refresh via `/admin/staffs/[userId]`; approval counts reflect matching data beyond the current page; exports disclose the 200-record limit; notification refresh can be dismissed; duplicate recovery submission buttons are disabled | staff, enquiry and recovery UI |
| Browser data | Logout clears only known auth state and application caches; personal todos and unrelated storage remain; authenticated HTML and arbitrary uploaded files are not cached by the service worker; blob previews and Pusher subscriptions are released | client cleanup, service worker, enquiry forms, project comments |
| Background work | Transactional MongoDB outbox for activity/comments, enquiry forwarding/facility matching, approved project creation/approval/assignments, team changes, calendar invitations, legacy task assignments and activity/comment/task file cleanup; bounded retrying workers, device checkpoints, lease recovery and superadmin job monitoring | `lib/jobs`, `models/background_jobs.model.ts`, `/superadmin/jobs`, producer routes |
| Consistency | Enquiry numbering uses transactional counters seeded from existing UUID suffixes; conversion stores project creation and enquiry closure/reference together and returns the existing project on repeat requests | enquiry sequence helper and conversion API |
| Activity records | Login/logout timestamps come from authentication events; tab close and refresh no longer generate false session transitions | `auth.ts`, `lib/auth-activity.ts` |
| Dependency maintenance | Next.js/Auth.js security releases, updated SDKs and request/database libraries, patched SheetJS export package, removal of unused PDF/document/upload dependencies | package manifest and lockfile |

The default enquiry page and task search reduce work and memory in the API process. Filtered counts, regex searches, large action histories and deep offset pagination still have database costs. Improvements in milliseconds or throughput require measurement against representative data.

## Before production rollout

1. Rotate the previously tracked database, authentication, SMTP, FTP, Pusher and server Firebase credentials at their providers and deployment secrets. `.env` was removed from Git tracking and preserved locally; `.env.example` contains names and empty placeholders. This does not erase older Git history or revoke leaked credentials.
2. Configure Node.js 22 or newer and install the locked dependencies. Firebase Admin 14 requires Node.js 22. Next.js remains on version 15.5; it was not migrated to a different major framework version.
3. Set `NEXTAUTH_URL` or `AUTH_URL` to the canonical public origin, plus a valid authentication secret. Recovery mail never trusts a request-supplied origin. Recovery and conversion transactions require a MongoDB replica set or sharded deployment.
4. Audit existing user emails for whitespace, mixed casing and case-insensitive duplicates before enabling normalized sign-in. The updated schema normalizes new writes and queries; old database values are not rewritten by this change.
5. Back up the target database, review the index plan, inspect existing indexes, then create declared indexes during a controlled rollout. The script retains unrelated indexes and does not rewrite records:

```sh
npm run db:performance-indexes -- --plan
npm run db:performance-indexes
npm run db:performance-indexes -- --apply
```

`--plan` does not connect to a database. Without `--apply` or `--plan`, the script uses the configured `MONGO_URI` and reports indexes it would create. `--apply` creates indexes and checks transaction support. This includes recovery/rate-limit TTL indexes. Production defaults to `MONGO_AUTO_INDEX=false`; do the explicit rollout before starting instances. Index construction can consume database resources, so observe the deployment while applying it.

6. Review and migrate legacy enquiry ownership as described below **before enabling these authorization changes**. An unmapped enquiry is intentionally excluded from business-admin management lists and denied administrative approval, deletion and conversion. Its creator and explicitly shared users retain their permitted access. Deploy only after verifying the mapping against the target database.
7. Review `MONGO_MAX_POOL_SIZE` (default 30) against instance count and the database connection budget. Each warm application instance has its own pool. Increase the number of application instances only while observing database pressure.
8. Smoke-test real SMTP delivery, browser recovery, login/logout, staff administration, head-scoped task search, conversion, file uploads, push permission/token registration and a received background notification. Include own-business and foreign-business enquiry links, explicit sharing, all enabled dashboard roles and legacy migrated enquiries. Local fixtures do not prove external provider configuration or browser-device behavior. Password changes intentionally require signing in again.

Private realtime channels are now `private-project-<projectId>` and `private-user-<userId>`. Any publisher outside this repository must use these names. Calendar pending results now explicitly describe the selected week; they are not a global overdue backlog. Export batches remain bounded to 200 entries.

## Enquiry ownership and sharing rollout

Administrator rights now require both an active BUSINESS_ADMIN role and an active administrator assignment to the enquiry's active business. A role selector or URL parameter cannot grant access. New enquiries and requested facilities/areas store verified `business_id`; existing enquiry ownership cannot be reassigned through ordinary Mongoose updates. Conversion must remain in the enquiry's owning business.

Explicit sharing permits enquiry reads and comments. Assigned action participants can perform their allowed action/edit operations. Sharing alone does not permit scheduling, approval, deletion, conversion, cancellation of another participant's work or reopening another participant's completed action. API capabilities are calculated per enquiry. Business-admin lists and exports contain managed enquiries; a shared foreign enquiry is available through its authorized detail link and participant workflows.

The existing geographic/facility directory remains common reference data. Enquiry-bound contacts and counts are filtered by visibility. Changing or deleting facilities used by another business is denied; matching a duplicate preserves a facility still referenced by another enquiry. Enquiry edits cannot approve a pending enquiry. Deleting shared countries, regions, provinces, cities, areas or head offices is restricted to superadmins because those legacy cascades have no business boundary. This stage does not redesign every directory, company or head-office relationship into tenant-owned data.

The migration script uses the configured `MONGO_URI`. Run it against a restored staging copy first. Its default mode only reports missing ownership and candidate businesses from current creator memberships and linked projects:

```sh
npm run migrate:enquiry-ownership
npm run migrate:enquiry-ownership -- --report ownership-report.private.json
```

The detailed report refuses to overwrite an existing file. Every row requires review, including rows with one suggested business: present membership does not prove historical ownership. Resolve ambiguous rows with authoritative business records. Create a separate reviewed mapping with this shape, replacing the example IDs with real IDs:

```json
{
  "000000000000000000000001": "000000000000000000000002"
}
```

After backup and review, apply that explicit mapping:

```sh
npm run migrate:enquiry-ownership -- --apply --mapping reviewed-ownership.private.json
npm run migrate:enquiry-ownership
```

The script validates the entire mapping before writing, rejects missing/inactive businesses and conflicting pinned ownership, and only fills missing `business_id`. Writes use batches of 500; the whole migration is not one transaction. If interrupted, rerun the same reviewed mapping safely. Do not infer remaining ownership merely to clear the report. Keep reports and mappings private and out of Git. Repeat the index rollout for the new business-list and user-log indexes, and verify administrator role/assignment records before switching traffic. These production steps have not been executed by this implementation.

## Regression checks

Local validation on October 1, 2026: all 118 isolated tests passed without skips, standalone TypeScript checking passed, and the production build passed. Nine isolated Chrome UI checks passed, including mobile width, dynamic row measurement, pagination, cancellation, cached return navigation and admin/staff cache separation. The build still reports 24 existing lint warnings. The dependency installation audit reports zero known vulnerabilities for the resolved lockfile; this is not a security certification. Full authenticated browser/provider smoke tests and staging load tests remain outstanding.

```sh
npm run test:isolated
npx tsc --noEmit
npm run lint
npm run build
npm run test:list-ui
npm audit --omit=dev
```

`test:isolated` requires `mongod` on PATH, or `MONGOD_BINARY`. It starts a temporary local replica set, uses separate test databases, and shuts it down afterward. It never uses the application's `MONGO_URI`. It exercises recovery expiry/replay/races, authentication revocation, business resource ownership, staff assignment/document access and business-scoped agent management, nested secret projections, MongoDB action filter equivalence, approval pagination, exact calendar bounds, simultaneous conversion, unique counters, scoped task searches, index rollout, spreadsheet exports and existing task/action workflows. Enquiry/dashboard regressions cover foreign record IDs, sharing without administrative escalation, all twelve dashboard roles, inactive assignments and businesses, guarded facility cascades and writes, pending-approval bypass prevention, persisted creation ownership, shared agent identities and reviewed/idempotent ownership migration.

Pagination tests exercise real task/history routes with isolated MongoDB: matching records beyond the first page, literal search characters, staff/skill search, full-scope counts, stable ties, filtered private activity IDs, notification anchors, invalid parameters, page clamping and duplicate/orphaned history grants. `test:list-ui` uses the actual pagination/query hooks, virtual list and superadmin job screen in an isolated mocked-HTTP fixture. It requires a successful build for CSS, Node.js 22+, and local Chrome/Chromium; set `CHROME_BINARY` when Chrome is not at the default macOS path or available as `google-chrome`. It creates a temporary browser profile and local fixture server, uses no application credentials or database, and removes them afterward. It does not replace authenticated end-to-end workflow tests.

Outbox tests exercise atomic enqueue/rollback, competing claims, expired leases, bounded retry exhaustion, read-state-preserving inbox replay, partial-device checkpoints, token ownership, safe file cleanup, protected runner/admin endpoints, concurrent completion counters, cascades, enquiry forwarding, document replacement and a standalone worker invocation against the isolated database. Browser checks cover job pagination, error/retry feedback, duplicate submission prevention and mobile layout.

## Task activity and enquiry history pagination rollout

Task detail and both enquiry-history APIs now return **25 records by default**, with a maximum requested `limit` of 100. Responses include `{ page, limit, total, pages }` pagination metadata. All repository consumers of these APIs have been updated. Any external consumer expecting the entire array must follow pagination. Apply the declared indexes before deployment: task activity `{ task_id, updatedAt, _id }`, history `{ enquiry_id, step_number, createdAt, _id }` and access `{ history_id, enquiry_id, user_id }`. The index script preserves existing indexes; review the older history index without `_id` separately after checking production query plans.

Activity `activitySearch` searches names, descriptions, assigned staff names and skill names in the authorized set; `activityStatus` accepts `pending` or `completed`. Search uses literal, bounded input. Pending includes legacy unset completion flags. Task activity summaries remain independent of the filter/page and staff totals include only visible activities. `activityId` resolves a notification link to its authorized page; private/deleted IDs cannot expose activities and receive a controlled unavailable message. Out-of-range pages clamp after deletion. Interactive task cards stay mounted within their bounded page and use browser content visibility so scrolling does not close their nested sheets or discard form state.

Enquiry history `kind` accepts `all`, `forwards`, `updates` or `completion`. The shared screen displays newest-first records with server-side filters and a visible page range. Read-only history rows use [TanStack Virtual's measured row rendering](https://tanstack.com/virtual/latest/docs/api/virtualizer); “Show all rows on this page” retains a complete DOM view for assistive technology or browser find. Staff responses keep the `history_id` wrapper. Spreadsheet exports explicitly offer the current page or all matching history, with a 5,000-record ceiling; exceeding the ceiling shows an error instead of silently truncating the workbook. Full exports fetch bounded pages only after the click, freeze new-history insertion using an `asOf` creation-time cutoff, and can be cancelled. These reads are not a transaction snapshot; concurrent changes to existing histories or sharing can still affect an export.

The production build's staff history initial JavaScript decreased from approximately **438 kB to 195 kB** after removing eager spreadsheet loading and sharing the history component. These are Next.js build estimates, not measured network transfer or page latency. Task/history responses now populate only the selected records. Exact counts, substring searches, visibility lookups and deep offset pagination still require database work; there is no claim of a measured throughput multiplier. Individual task activity schedule/reassignment arrays and the enquiry action-management dialog remain separate opportunities for bounded loading.

## Measuring 3,000 concurrent users

A staging-only k6 scenario is in `tests/load/concurrent-users.k6.js`. Prepare distinct test users with active sessions and real persisted admin/staff assignments. Each fixture needs `userId`, `businessId`, `regionId`, `roleId`, `role` and `cookie`; staff actors need an active REGION_STAFF assignment to that region and role. Include both admin and staff actors in the tested cohort. Use the example fixture's shape, keep the actual fixture in ignored `actors.local.json`, and ensure tokens remain valid throughout the test. Head-role fixtures need their selected role/domain cookies. Use test data reflecting production volumes and distributions, including long activity/action histories.

```sh
k6 run --env BASE_URL=https://your-staging-origin.example --env ACTORS_FILE=./actors.local.json --env MAX_USERS=3000 tests/load/concurrent-users.k6.js
```

The relative fixture path is resolved from the load script directory. The scenario ramps through 300, 1,000 and 3,000 active sessions, holds the peak for ten minutes, and mixes task lists (35%), enquiry lists (20%), calendar reads (15%), staff dashboards (10%), organization summary/section reads (15%) and facility maps (5%) with five-to-fifteen-second think times. Admin dashboard selections fall back to organization summaries. Setup checks authenticated payloads before the ramp. Initial thresholds are API p95 below 750 ms, p99 below 2 seconds and errors below 1%, with additional latency thresholds for each endpoint; these are proposed targets, not measured guarantees. The scenario measures authenticated read traffic. Separately measure login bursts, writes, uploads, exports, push delivery, browser rendering and slow networks. Do not use one session token to represent 3,000 different users.

Record API p50/p95/p99, request rates, response bytes, application CPU/RSS, event-loop delay, warm/cold instance counts, MongoDB CPU/cache/IOPS, connection counts, query execution plans and keys/documents examined. Compare the baseline and change on the same dataset, hardware and workload. Check that the load generator itself has spare CPU/network capacity. Server sizing follows the measured saturation point and availability requirements; it cannot be derived from the number of registered users alone.

### Isolated local production benchmark — October 4, 2026

The local runner uses installed Node and `mongod`; k6 is not required. It creates its own loopback MongoDB replica set, overrides project environment keys in child processes, builds into a unique `.next-performance-*` directory, applies declared indexes only to the temporary database, and starts a real production Next server. It issues distinct Auth.js JWTs for persisted users rather than mocking authentication. Temporary servers, build output and database files are removed on completion. No existing application database is used and no sessions are saved to the report.

```sh
npm run test:performance:local -- --trace-queries
# Short smoke test retaining the same 3,000-user dataset:
npm run test:performance:local -- --users 100 --fixture-users 3000 --hold 10 --output tests/load/smoke-results.json
# Sequential real-HTTP database profiling and execution plans, without a load ramp:
npm run test:performance:local -- --users 100 --fixture-users 3000 --diagnostics-only --output tests/load/query-results.json
```

The baseline in `tests/load/local-performance-results.json` used 3,000 persisted users in ten businesses, 30,000 tasks, 30,000 activities, 30,000 enquiries/actions/access rows, 10,000 facilities and 3,000 calendar events. It ran on macOS with ten logical CPUs and 16 GiB RAM, one Next process, a single-member MongoDB replica set with a 1 GiB WiredTiger cache, and a 30-connection application pool. A development server was also present; the reported repeat used a separate production build directory. Application, database and generator share the machine. This is a local diagnostic baseline, not production sizing evidence.

| Active virtual users | Steady requests | p95 | p99 | Error rate | Completed requests/second during hold |
| --- | --- | --- | --- | --- | --- |
| 100 | 290 | 939.5 ms | 1,088.7 ms | 0% | 9.80 |
| 500 | 753 | 14,766.6 ms | 15,001.0 ms | 41.57% | 31.27 |

Each stage had a ten-second ramp and thirty-second hold with five-to-fifteen-second think times. Latency/error summaries include requests started during the hold and completed during drain; the completion rate counts responses completed inside the hold. The closed workload slows its offered request rate when responses become slow. At 500 users, MongoDB averaged about 8.96 CPU cores, Next about 0.21, and the generator about 0.02. Peak MongoDB RSS was about 1,286 MiB and Next about 693 MiB. The guard stopped after errors exceeded 20%; **1,000 and 3,000 users were not attempted**. Neither stage met all latency/error targets. No prior comparable HTTP baseline exists, so no speedup multiplier can be claimed.

Separate sequential profiling/explain calls confirmed two high-priority query problems with declared indexes already applied:

- `app/api/enquiries/staff-side/get/user-enquiries/route.ts`: the initial visibility pipeline performs a collection scan over 30,000 enquiries and an indexed access lookup for each candidate before retaining ten visible records. Its traced aggregation took 809 ms. Start with indexed owned/shared candidate IDs and deduplicate before the remaining filters/count/pagination, preserving explicit sharing and authorization.
- `app/api/task/staff-task/get-filtered/route.ts`: the correlated visible-activity `$lookup` does ten collection scans over 30,000 activity documents, examining 300,000 activity records to serve ten tasks. Its traced aggregation took 139 ms. Make `task_id` equality indexable before applying the visibility expression, and verify the existing index is used without changing creator, assignee, team or supervised visibility rules.

The 500-user steady cohort contained 440 successful responses, 125 HTTP 401s, 159 HTTP 500s and 29 client timeouts. JWTs were valid in preflight and after the load. A shorter follow-up with the same dataset (`tests/load/pool-contention-check.json`, ten-second holds) reproduced HTTP 401/500 failures and recorded 187 `MongoWaitQueueTimeoutError` and 31 `JWTSessionError` log occurrences; these are string occurrence counts, not unique errors. It recorded no server-selection or network-timeout error occurrences. The evidence and inspected authentication flow indicate pool starvation during the database-backed JWT check: `lib/mongo.ts` has a two-second wait-queue timeout, the `auth.ts` JWT callback queries the user without distinguishing temporary database failure, and `middleware.ts` returns 401 when Auth.js resolves no session. The installed Auth.js session error handler also clears session cookies on callback exceptions, which can turn database overload into a user logout. Handle temporary authentication-storage failure as a retriable 503 while continuing to deny access and preserve valid session cookies; keep real revocation/inactive-user checks. Do not simply increase the pool while MongoDB is CPU-saturated.

Do not treat these failures as successfully handled users. The fixes and subsequent local measurements are recorded below. Conduct the ten-minute staging peak and a longer soak on deployment hardware with a separate generator. The synthetic fixture has short histories and only ten projects; add realistic project volumes, long histories, write traffic and geographic skew for that staging test.

### Query and authentication fixes — October 4, 2026

- `lib/enquiries/staff-visibility-pipeline.ts` and the staff enquiry route now use the existing creator/access indexes to union owned enquiries and explicitly shared records inside MongoDB. Both branches apply the requested document filters; duplicate access/history records are deduplicated before enrichment, action filtering, counts and pagination. Cross-business explicit sharing and the staff list's existing visibility policy are preserved. No unbounded access-ID array is transferred into application memory.
- The staff task route now uses `localField: _id` / `foreignField: task_id` before applying the original activity visibility expression. The existing activity index is used; no new index declarations or data migrations were introduced. Production still needs the declared creator/access/task indexes applied through the reviewed index rollout.
- `lib/auth-availability.ts` wraps authentication operations with isolated request state. Temporary database failures deny access and return an uncached 503 with Retry-After, replacing Auth.js cookie-clearing responses. Server session consumers throw a specific unavailable error instead of returning a truthy error object or pretending the user logged out. The measured task, enquiry, calendar, dashboard, organization and map endpoints also classify temporary database failures as 503. Invalid/revoked/blocked/deleted sessions retain ordinary denial and cookie cleanup. Public auth/recovery/worker endpoints bypass browser-session middleware and retain their handler-owned checks. Credentials POST failures retain the next-auth/react redirect-false response contract.
- `components/shared/SessionRecovery.tsx` keeps failed browser session refreshes in a loading/retry state until a follow-up session read confirms a genuine logout. It restores the upstream provider on recovery and cancels pending checks on unmount. Normal healthy session refreshes make no additional calls. Sign-in forms retain entered values on failure and report temporary unavailability; `app/global-error.tsx` supplies a retry for failed initial workspace rendering.

The repeat in `tests/load/optimized-performance-results.json` used the same hardware, pool, data volumes, endpoint mix, ten-second ramps and thirty-second holds as the baseline. Every stage met the proposed latency/error targets:

| Active virtual users | Steady requests | p95 | p99 | Error rate | Completed requests/second during hold |
| --- | --- | --- | --- | --- | --- |
| 100 | 300 | 33.6 ms | 45.4 ms | 0% | 10.00 |
| 500 | 1,457 | 22.0 ms | 30.3 ms | 0% | 48.57 |
| 1,000 | 2,952 | 17.8 ms | 21.3 ms | 0% | 98.43 |
| 3,000 | 8,803 | 29.9 ms | 68.2 ms | 0% | 293.90 |

At 500 users, observed MongoDB CPU fell from about 8.96 to 0.21 average cores while throughput increased. At 3,000 users the application averaged about 0.96 CPU cores and MongoDB about 1.00, with approximately 549 MiB and 514 MiB peak RSS respectively. The generator averaged about 0.09 cores. These process measures are local averages, not recommended production CPU allocations or proof of spare capacity under different traffic.

Separate explain/profiling runs confirm the task activity lookup examines **10 activity documents instead of 300,000**, uses `task_id_1_createdAt_1__id_1`, and performs zero collection scans. The staff enquiry aggregation's profiler reports **52 total examined documents instead of 30,032**, including owned/shared candidates and downstream joins, with an indexed creator entry stage. These measurements explain the change; they are not a claim that every application operation became equally faster.

Real HTTP fault injection is available with `--auth-failure-probe`, enabled only in the temporary loopback MongoDB test server. Forty-five concurrent session checks against deliberately blocked database reads produced thirty valid responses and fifteen 503s. Every 503 preserved cookies and included Retry-After; the original cookie worked after recovery. Blocked users, password-revoked sessions and deleted accounts were subsequently denied with cookie cleanup. Fault injection happens after load measurements, and is disabled in a finally block.

```sh
npm run test:performance:local -- --trace-queries --auth-failure-probe --output tests/load/optimized-performance-results.json
```

Final validation passed: **170 isolated automated tests, 40 browser fixture checks, TypeScript checking, production build, authenticated HTTP preflight and real HTTP outage/revocation checks**. The browser fixture also checks 503/network refresh failures, visible retry, upstream session recovery and genuine logout alongside existing list/map/calendar workflows. `UI_TEST_BUILD_DIR` allows it to use CSS from an isolated production build. An additional short final production smoke/fault-injection result is saved separately in `tests/load/final-verification-results.json`; concurrent browser QA in `implementation-smoke-results.json` makes that earlier smoke unsuitable for latency comparison. The application has passed the **short local 3,000-active-session read test**, not a production soak, a 3,000-simultaneous-request burst, login capacity, uploads, external delivery or write-heavy capacity test. Deployment and longer staging validation remain outstanding.

## Remaining architectural work

- Review the remaining common geographic/company/head-office catalogue mutation and data-relationship policies separately. This authorization stage protects enquiry records and organizational dashboard selections; it is not a certification of every API or complete tenant isolation for all reference data.
- Continue remaining large-list/table and form/navigation accessibility work; bound individual activity schedule/reassignment histories and the action-management dialog separately. Main task activity and enquiry history pages are now paginated.
- Review abandoned-upload retention separately. The manual `/api/notifications/send` endpoint now also saves the inbox and delivery job atomically and responds with HTTP 202; see `deploy/NOTIFICATIONS.md`.
- Audit and deduplicate legacy camp/enquiry UUID, conversion and membership data before enforcing new uniqueness constraints. Existing scalar/legacy scope references need a coordinated migration.
- Reduce remaining large dashboard counts/read waterfalls and deep offset pagination. The map location list uses bounded offset pages; personal custom-pin list reads remain separate from the viewport API.
- Provide a separate bounded overdue backlog. Busy calendar feeds now have cursor pages; the workspace keeps week results distinct from a global overdue backlog.
- Review server Firebase storage rules, upload limits, CDN/private-media caching, production logging, database observability, backups and autoscaling settings in the deployment accounts.
- Finish decomposition of large task/enquiry components and remaining duplicate request/state logic. Query cancellation currently covers the main enquiry/calendar feeds, not every request.
- Perform the staging load test and browser/provider smoke tests; tune capacity based on results.

## Dependency references

The dependency choices were checked against [Auth.js's advisory](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-8fpg-xm3f-6cx3), [Next.js advisories](https://github.com/vercel/next.js/security/advisories), [Firebase JavaScript release notes](https://firebase.google.com/support/release-notes/js), [Firebase Admin release notes](https://firebase.google.com/support/release-notes/admin/node) and [SheetJS's official installation instructions](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/). The staging scenario uses [k6 ramping virtual users](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/).


## Durable background jobs rollout

The following flows now commit their business writes and jobs in the same MongoDB transaction:

- Task activity creation, completion and deletion enqueue notification events.
- Activity comments enqueue their notification events; comment deletion queues attachment cleanup.
- Activity document replacement and task/activity cascade deletion queue file cleanup.
- Enquiry forwarding commits history, explicit access grants, priority and its notification event together.
- Approved project creation and project approval enqueue head notifications together with the project write and flow log. Approval repeats do not send another notification.
- Project head, supervisor, account manager and site operational head changes commit the assignment, flow log and notification together. Transactional fresh reads preserve concurrent additions; unchanged assignments do not send another notification or log.
- Team creation, editing and deletion commit the team/member writes, flow log and assignment notifications together. Member IDs are deduplicated, validated in two batched reads and bounded to 500 per request; recipients reflect the actual assignment changes.
- Calendar creation commits the event and invitations together. The sender is excluded from invitations; attendee IDs are bounded to 100 and must identify active members of the resolved business. Invitations to others require a persisted administrator assignment or verified head scope; cookie role labels alone grant no permission.
- The legacy task creation endpoint commits non-project assignment notifications with task creation. It checks the assignee's active business membership and restricts staff/head assignment scope. Existing project-task creation behavior is preserved.
- Facility matching commits duplicate-enquiry cleanup and its recipient notification together; queue failure rolls back the cascade instead of losing the notification.

These automated routes never call Firebase messaging directly; they wait only for transactional database writes. `/api/notifications/send` uses the same durable inbox/outbox and returns HTTP 202 with the recipient count. Repeating create requests can still create distinct records; outbox deduplication does not provide client request idempotency. Failed comment submissions retain their upload for a retry; abandoned uploads are not swept by this worker.

`tests/security/notification-flows.test.cjs` exercises the real routes with an isolated replica set, including queue-failure rollback, concurrent assignment/approval requests, team recipient changes and cascades, sender exclusion, foreign/inactive recipients, forged role cookies, valid/revoked head scopes and facility cleanup. Provider calls are intercepted and forbidden in the business-route tests; production Firebase delivery still requires a staging smoke test.

### Activation order

1. Use a replica set or sharded MongoDB deployment. Apply the index script before deploying the new writers. It pre-creates `background_jobs`, flow logs, project teams and project departments, and ensures the declared indexes, including the queue's unique deduplication, claim, monitor and completion-TTL indexes, the device-user index, and file-reference indexes. A unique dedupe index is required for worker concurrency safety.
2. Deploy the web application and a dedicated Node.js worker from the same release, with the same database and Firebase service-account/storage settings. Starting the worker is a separate deployment action; running `next start` alone does not consume jobs.

```sh
NODE_ENV=production npm run worker:jobs
```

Use a process supervisor/container with automatic restart, protected environment settings and graceful termination. The worker polls every two seconds when idle and finishes its current job on SIGTERM/SIGINT. A one-off bounded drain is available for maintenance:

```sh
NODE_ENV=production npm run worker:jobs -- --once
```

Do not run these commands locally against production merely to verify this change: they process real queued notifications and delete retired uploads. The automated CLI test uses only an isolated, randomly named test database and performs no external delivery.

3. If using a scheduler instead, configure a random `CRON_SECRET` of at least 32 characters and invoke `GET` or `POST /api/internal/jobs/run` with `Authorization: Bearer <CRON_SECRET>`. The handler checks the secret even though its exact path bypasses session middleware. Each invocation claims at most 20 jobs, stopping new claims after a 35-second budget; an already claimed provider call can finish after that budget. The route requests a 300-second execution limit, which must be supported/configured by the hosting plan.

Vercel Pro/Enterprise cron supports minute intervals; Hobby cron is limited to daily execution, which is unsuitable for timely notifications ([Vercel limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Vercel supplies the `CRON_SECRET` bearer header for protected scheduled invocations ([securing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs)). On a supported plan, merge this configuration into the deployment's `vercel.json` after setting the secret:

```json
{ "crons": [{ "path": "/api/internal/jobs/run", "schedule": "* * * * *" }] }
```

No scheduler has been enabled by this repository change. A minute scheduler also adds up to a minute of polling delay before processing a new event, plus backlog/provider time. A dedicated worker provides more timely delivery.

### Operation and guarantees

- Multiple worker processes can share the queue. Atomic claims use two-minute expiring leases with 20-second heartbeats; stale acknowledgements and stale workers entering processing are rejected. Crashed workers' jobs become eligible after their lease expires.
- Each job has at most eight automatic attempts. Backoff starts at 60 seconds, doubles up to a 15-minute base delay, and adds up to 20% jitter. Invalid device tokens are pruned; confirmed successful devices are removed from retry payloads. Permanent per-device push errors and exhausted attempts remain failed for review.
- Inbox materialization and child push jobs commit together. Deterministic inbox IDs and unique job keys make reprocessing idempotent and preserve read state. Push delivery is **at least once**: a crash or lost provider response after provider acceptance can still cause duplicate delivery. There is no exactly-once claim for external messaging.
- Push jobs carry at most 100 devices, recheck stored token ownership, and never exceed FCM's multicast limit. File cleanup checks live document/comment references and uses generation preconditions; missing objects succeed, changed generations fail for review. New references to retired upload paths are rejected; clients generate fresh UUID upload paths.
- Completed job payloads are cleared and dedupe records expire after 30 days. Failed jobs retain their payload until reviewed; the monitoring API exposes only identifiers/status/times and sanitized error codes, never tokens, recipients or paths. Treat queue storage/backups as private operational data.
- `/superadmin/jobs` shows counts, the oldest queued event, paginated job status and an explicit retry for failed jobs. Retrying preserves the push checkpoint, records the administrator/time and increments an audit counter. Investigate provider configuration before retrying a permanent error. Retrying a `job/file-generation-changed` cleanup requires inspecting the replaced object first; automated retry will otherwise inspect its current generation.
- Monitor worker liveness, oldest pending age, processing leases, failure counts, MongoDB pressure and provider quotas. A growing pending queue with no processing work usually means the worker is stopped. Scale workers only after measuring throughput and database connection budgets; each process has its own MongoDB pool. The outbox improves durability and removes provider waits from these API requests, but does not certify 3,000-user capacity.

Before enabling production traffic, use staging to verify a real inbox/push notification, an invalid device token, Firebase outage/recovery, removal of an actual upload, worker restart mid-job, and superadmin retry permissions. No production worker, cron or provider integration was activated during local implementation.

## Facility map and calendar pagination rollout

The map API now has three modes, all requiring a signed-in session:

- `mode=overview` computes status totals and initial bounds over all approved facilities with indexed coordinates in the selected country/region/province. It returns no facility documents.
- `mode=viewport&south=…&west=…&north=…&east=…&zoom=…` queries only the visible rectangle. Bounds crossing the date line split into two rectangles. Adaptive grid aggregation produces fewer than 500 cells without collecting arrays of facility IDs; single-facility cells alone are populated. A cluster count includes every matching facility in its cell. This reduces client marker work while retaining full coverage, including coincident facilities that can be opened in the location list.
- `mode=list&page=…&limit=…&search=…` searches the selected geography or cluster rectangle before pagination. The default page is 50, maximum 100. Names, location names and coordinates are searched literally; only page records are populated. This list preserves access to facilities outside the visible map area.

Approved facility geography remains a shared catalogue, as before. The map API does not return enquiry records, grant enquiry access or change enquiry business ownership rules. Personal custom-pin management remains unchanged; only the selected custom pin is rendered on this map.

Facility `latitude`/`longitude` strings remain the source fields. The additive `map_point` is a numeric `[longitude, latitude]` pair derived by document validation; zero is valid, blank/non-finite/out-of-range coordinates are excluded. Projected name/status saves preserve existing points. Coordinate changes through query updates are rejected: load both source fields and use `save()`, so the source and derived pair change together. Raw database/import writers must maintain the pair or rerun the migration.

The `2d` index supports these rectangular `$geoWithin/$box` queries; this is viewport containment, not a spherical distance calculation ([MongoDB rectangular queries](https://www.mongodb.com/docs/manual/reference/operator/query/box/)). The index script now includes facility geography and filter indexes.

**Existing facilities will not appear on the new map until their points are backfilled.** Use a staging copy first, review the invalid-coordinate count and retain a database backup. In a controlled cutover, pause facility coordinate changes while applying the backfill and switching all writers to this release, then rerun the dry run until `changed` is zero. Alternatively, keep map traffic closed until the new writers, backfill and indexes are ready. The migration preserves source fields, streams records and writes batches of 500; each write checks that its source coordinates have not changed during the scan. It is safe to rerun and defaults to reporting only:

```sh
npm run migrate:camp-map-points
npm run migrate:camp-map-points -- --apply
npm run db:performance-indexes -- --apply
npm run migrate:camp-map-points
```

These commands use the configured `MONGO_URI`; they were not run against production during implementation. Index declarations were checked locally with `--plan`, and migration/index behavior was exercised against isolated temporary databases.

The map reports bounds on idle, debounces them by 250 ms and cancels obsolete requests with a 15-second timeout. Previous viewport results remain visible while refreshing within the same filters; session/filter changes cannot reuse those results. Viewport cache entries expire after 30 seconds of inactivity. Markers are reconciled by identity/content rather than rebuilt wholesale, and data refreshes do not refit the camera. Filter selection fits the full geographic scope once; explicit facility/custom-pin selection still focuses that point. Errors have retry controls and are not converted to successful empty results.

Calendar `GET /api/calendar/feed` now accepts `limit` (default 100, maximum 200) and an opaque `cursor`. It returns `pagination.nextCursor`, or `null` when the matching results are exhausted. Task, pending enquiry-action, legacy initial-action and custom-event pipelines apply the existing access/date rules before a combined database search/count/page operation. Literal title/description/person/team/enquiry-number search runs before paging; population is limited to page records. Order is stable by start time and source-prefixed ID, so equal-time records remain reachable across pages. Legacy initial actions are excluded when a stored initial action exists.

`summary.total`, source counts and `summary.pending` describe the full matching set, independent of the cursor. The workspace replaces each bounded page instead of accumulating an unlimited list. Day badges, overlapping-slot cards and task cards reflect the current page and are explicitly labeled; previous/next controls expose additional records. Week, business, role/domain and search changes reset the cursor before issuing a request. Returning to a fresh cached page requires no repeat fetch. A cursor is not a snapshot: concurrent edits can move an item across its ordering boundary; refresh/start from page one when a consistent current view is required. Database counting, joined-name searches and union sorting still have costs at large scale; this stage bounds API/browser memory and response size rather than removing every database scan.

Validation uses `tests/security/large-views.test.cjs` with real isolated MongoDB for point maintenance/backfill, zero/invalid coordinates, actual geographic index selection, date-line bounds, geographic filters, literal location search, cursor ties, every calendar source, legacy deduplication, exact task timestamps, unscheduled-task exclusion, full-result counts and foreign/staff/team/event access. Browser fixtures use the real map component and query/paging hooks with mocked Google Maps and HTTP; no Google/Firebase calls, credentials or production records are involved. Staging must still verify real Google Maps camera/marker behavior and representative real data before cutover.

`tests/load/large-view-fixture-results.json` records one local comparison using 10,000 facilities and 1,500 scheduled tasks. The baseline reproduces the previous unbounded reads/population/mapping; the new measurements include route authorization and bounded responses. Timings are single-run observations from a temporary local database during the test suite, without network latency, production contention or 3,000 concurrent users. Response-byte/marker reductions are reproducible for this fixture; production speedups and capacity still require the authenticated load test described above.

## Dashboard and organization overview stage

The staff dashboard retains all twelve role/assignment/business checks and the existing four-project preview. Task counts now use one business-scoped status aggregation, with explicit ObjectId casting, instead of separate pending/completed scans. The membership lookup is shared with project filtering; task visibility includes membership and headed teams, while staff project visibility still uses membership teams and created projects. An overlapping creator/assignee/team task is counted once. Department-head project filters use the already-authorized department's parent and type. User-name, breadcrumb and dashboard reads run independently; selected organizations are reused instead of fetched again. Profile population starts from the authorized resource. Project population and returned fields are limited to the existing four-card preview.

The following existing `get-complete` URLs now share a bounded contract. Deploy their server and UI changes together; refresh browser tabs running older bundles, and migrate any external consumers that expected nested complete arrays.

| Path under `/api/business/` | Required parameter | Main sections |
| --- | --- | --- |
| `regions/get-complete` | `region_id` | `heads`, `staffs`, `areas`, `departments` |
| `area/get-complete` | `area_id` | `heads`, `staffs`, `locations`, `departments` |
| `locations/get-complete` | `loc_id` | `heads`, `staffs`, `departments` |
| `region-dep/get-complete` | `region_dep_id` | `heads`, `staffs`, `area_departments` |
| `area-dep/get-complete` | `area_dep_id` | `heads`, `staffs`, `subdeps` |
| `location-dep/get-complete` | `location_dep_id` | `heads`, `staffs` |
| `departments/get-complete` | `dep_id` | `heads`, `staffs`, `regions`, `areas` |

With `mode=summary` (the default), the response is `{ data: { organization, counts }, status: 200 }`. Counts cover all active assignments/children, and no detail lists are embedded. Missing/inactive organizations return 404 rather than a successful undefined result. Active orphan person assignments are retained as removable rows with a null user; they are not silently discarded from totals.

With `mode=section&section=staffs&page=1&limit=25&search=...`, the response is `{ data: [...], pagination: { page, limit, total, pages }, status: 200 }`. The default limit is 25, maximum 100; page must be an integer from 1 to 100,000. Searches are literal, at most 100 characters, and run before pagination/counting. User name, email and phone searches use an explicit public-field allowlist; department lists also search joined area/location names. Rows are ordered by `_id` so ordinary page navigation has a stable tie-breaker. Offset pages are not snapshots: concurrent additions/removals can move records between pages; refresh from page one for a consistent current traversal.

Every overview also has an on-demand `available_staffs` section. Geographic and generic business-department choices use active business staff linked to active users. Region-department choices preserve regional user assignments; location-department choices preserve location user assignments; area-department choices combine active area heads/staff and deduplicate users. Generic departments also expose `available_regions` and `available_areas`; area choices are joined to **all** active region assignments for that department, independent of the displayed region page. Choices do not preload when entering an overview, and closed dialogs do not refetch during mutations. Counts and options remain business-scoped on the server; browser-provided model names/filters cannot change the relationship query.

Regional subdepartment counts resolve actual area ancestry, including legacy rows missing denormalized `region_id`. Area/location subdepartment lists now consistently omit inactive departments and inactive parent branches. Grouped child headings are derived from parents populated on the current department page, so a child cannot disappear merely because its parent was on a different area/location page. Missing department-parent assignments return 409 instead of running a query with an undefined parent.

Client queries have session/organization/section/page/search keys, 30-second freshness and one-minute inactive cache retention. Each visible section activates its own request; other sections wait until near the viewport. Input is debounced by 300 ms; changed organizations synchronously reset page/search and cannot reuse another organization's data. Axios consumes abort signals and has a 15-second timeout. Errors hide stale rows and show retry controls. Successful mutations invalidate summaries and section caches; deleting the last page returns to an existing page. Full counts are labeled separately from searched-page totals.

Server-side duplicate checks protect generic department head/staff/region/area additions even when an existing row is outside the displayed page. Staff checks use the actual `staff_id`, area-department checks use `area_dep_id`, and regional staff reactivation reports success after committing. Generic department add buttons also prevent repeated pending submissions. Legacy area/location department forms use `dep_id`; authorization now resolves that ID against the corresponding server route's department collection, retaining stored business ownership and selected-user membership checks. Missing Mongoose parent/user refs on locations and location heads were added without rewriting stored IDs, making population and assignment ownership traversal work consistently. Existing duplicate data is not removed, and these existence checks do not provide a database uniqueness guarantee for simultaneous first-time writes from different clients. Generic business-department add routes still require their existing legacy `DEPARTMENT_HEAD`/`DEPARTMENT_STAFF` role records; no new role taxonomy was introduced.

The additive index rollout now includes organization resource/assignment collections and regional/location user-assignment collections. Parent/status/ID indexes support section counts and ordered pages, user/parent/status indexes support role assignment checks, a user/status/business staff index avoids full roster scans during overview authorization, and additional type/area/department-region indexes support child and option queries. Review the new declarations in staging, then use the existing backed-up, controlled `db:performance-indexes -- --apply` procedure before enabling this release in production. Production auto-indexing remains disabled by default; the source declarations alone do not create production indexes. No production index application or record migration was executed here.

`tests/security/organization-overviews.test.cjs` exercises all seven summary/detail shapes, full-result counts and traversal, literal joined searches, credential projection, every business boundary, inactive/missing parents, legacy ancestry, choices across more than one region page, candidate-source rules, server duplicate/reactivation behavior and dashboard task/team/business filtering. The existing twelve-role dashboard/profile authorization regression remains in place. The 10,000-staff fixture compares the previous full staff population against a summary plus one page, and explains the actual section pipeline to verify that only page staff/users are examined/populated. Results are saved in `tests/load/organization-overview-fixture-results.json`; byte reductions are specific to that dataset, and timings are single local observations.

Browser fixtures exercise the real overview hook and controls for lazy loading, exact totals, next-page traversal, debounced literal search, scope changes, cancellation, error/retry behavior, selector open/close/refetch behavior, last-page deletion recovery and mobile layout. They use isolated mocked HTTP and do not touch production records/providers. Staging must still exercise real add/remove/navigation workflows and representative organizational data, then run the authenticated 3,000-user load scenario before making server-capacity or application-wide speedup claims. Joined searches/ancestry checks and exact totals still consume database work; deep offset pages can become expensive even though response and browser memory are bounded.

Local verification after this stage: all 162 isolated tests passed, all 36 browser fixture checks passed, TypeScript checking and the production build passed, and the index declaration plan and whitespace checks passed. The build retains 24 existing lint warnings. The 10,000-staff fixture recorded 3,786,908 bytes for the full read versus 10,525 bytes for summary plus first page; the actual page pipeline examined 25 staff and 25 user documents, and the membership authorization distinct query examined two index keys. No production capacity certification follows from these local results.
