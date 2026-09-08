# Enquiry completion

Completion is separate from the sales status. Manual completion preserves that status,
records the final Call/Visit and notes, and requires the existing `is_active` approval.
Admins, the creator, and latest forward assignees may complete an enquiry. Existing
viewers receive access to its completion/reopening history, but visibility alone does
not grant permission to complete. Only admins can reopen manual/legacy closures.
Awarded and converted enquiries remain completed and retain their existing forwarding
behavior. Edits do not clear completion.

## API

- `GET /api/enquiries/update/enquiry/complete?enquiry_id=…`: fresh action and permissions.
- `PUT /api/enquiries/update/enquiry/complete`: `{ enquiry_id, action: "Call" | "Visit", notes, source_forward_id: string | null, expected_updated_at }`.
- `PUT /api/enquiries/update/enquiry/reopen`: `{ enquiry_id, notes, expected_updated_at }`.

Both mutations require nonblank notes (maximum 5,000 characters). The server takes the
actor from authentication. A 409 response means the enquiry was completed elsewhere
or changed after the dialog was opened; close/reopen the dialog before submitting again.
The old close endpoint applies the same validation. Forwarding no longer accepts
`Finished` or `is_finished: true`; users must use the completion dialog.

Lists and filtered exports accept `completion_state=all|completed|non_completed`,
`period_from` (inclusive ISO timestamp) and `period_to` (exclusive ISO timestamp).
Completed results use the saved completion date; other results use `updatedAt`.
The UI computes UTC boundaries from local calendar dates, including the entire final
day. Weeks start Monday. Missing legacy completion dates fall back to `updatedAt` and
are identified as estimated until migration recovers/fixes them.

## Existing records

Run the migration before rolling out the feature to freeze historical completion dates:

```sh
npm run migrate:enquiry-completion                 # dry run; no changes
npm run migrate:enquiry-completion -- --apply      # apply to configured MONGO_URI
```

The migration recovers dates/actors from history where available, otherwise preserves
the old updated date as an estimate. It does not create fictitious history or actors,
does not modify original timestamps, guards concurrent edits, and can be run repeatedly.
New fields are additive. Application rollback does not require deleting them.

## Verification

```sh
npm run test:enquiries
npx tsc --noEmit --incremental false
```

Tests require `mongod` on PATH. They launch a disposable, loopback-only replica set on
a free port and remove it afterward. They never connect to the application's configured
database. Authentication and notifications are isolated for HTTP tests. The suite checks
transaction rollback, concurrency, permissions, history access, reopening, date filtering,
legacy migration, and old closure/forwarding bypass attempts.
